import type { FastifyInstance } from "fastify"
import { ClinicActivityAction, ClinicActivityEntityType, ClinicStatus, InventoryMovementType } from "@prisma/client"
import { z } from "zod"
import { prisma } from "../db.js"
import { requireAuth } from "../middlewares/auth.js"

const createProductSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  brand: z.string().min(1, "Marca é obrigatória"),
  category: z.string().min(1, "Categoria é obrigatória"),
  contentUnit: z.string().min(1, "Unidade é obrigatória"),
  contentPerPack: z.number().positive("Conteúdo por embalagem deve ser positivo"),
  packLabel: z.string().min(1, "Rótulo da embalagem é obrigatório"),
  packs: z.number().positive("Número de caixas deve ser positivo"),
  minPacks: z.number().nonnegative("Mínimo de caixas deve ser zero ou positivo"),
  packCost: z.number().nonnegative("Custo da caixa deve ser zero ou positivo"),
  lot: z.string().min(1, "Lote é obrigatório"),
  expiresAt: z.string().nullable().optional(),
  supplier: z.string().nullable().optional(),
})

export async function inventoryRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireAuth)

  fastify.addHook("preHandler", async (request, reply) => {
    if (!request.clinic) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Nenhuma clínica ativa vinculada à sessão." },
      })
    }
    if (request.clinic.status === ClinicStatus.BLOCKED) {
      return reply.status(403).send({
        error: { code: "CLINIC_BLOCKED", message: "Acesso da clínica temporariamente suspenso." },
      })
    }
  })

  // GET /api/inventory
  fastify.get("/inventory", async (request) => {
    const clinicId = request.clinic!.id
    const products = await prisma.inventoryItem.findMany({
      where: { clinicId, archivedAt: null },
      orderBy: { createdAt: "desc" },
    })

    return { items: products }
  })

  // GET /api/inventory/movements
  fastify.get("/inventory/movements", async (request) => {
    const clinicId = request.clinic!.id
    const movements = await prisma.inventoryMovement.findMany({
      where: { clinicId },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return { movements }
  })

  // POST /api/inventory (Cadastra novo produto/lote)
  fastify.post("/inventory", async (request, reply) => {
    const parseResult = createProductSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_INPUT",
          message: parseResult.error.errors[0]?.message || "Dados inválidos.",
        },
      })
    }

    const body = parseResult.data
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const totalQuantity = body.packs * body.contentPerPack
    const minQuantity = body.minPacks * body.contentPerPack
    const parsedExpiresAt = body.expiresAt ? new Date(body.expiresAt) : null

    // Refinement 3: Unique lot check within clinic. If same lot exists, instruct restock
    const existingLot = await prisma.inventoryItem.findFirst({
      where: { clinicId, name: body.name.trim(), lot: body.lot.trim(), archivedAt: null },
    })

    if (existingLot) {
      return reply.status(400).send({
        error: {
          code: "DUPLICATE_LOT",
          message: "Este lote já está cadastrado para este produto. Utilize a opção de Reposição.",
        },
      })
    }

    const { product } = await prisma.$transaction(async (tx) => {
      const newItem = await tx.inventoryItem.create({
        data: {
          clinicId,
          name: body.name.trim(),
          brand: body.brand.trim(),
          category: body.category.trim(),
          contentUnit: body.contentUnit.trim(),
          contentPerPack: body.contentPerPack,
          packLabel: body.packLabel.trim(),
          quantity: totalQuantity,
          minQuantity,
          packCost: body.packCost,
          lot: body.lot.trim(),
          expiresAt: parsedExpiresAt,
          supplier: body.supplier?.trim() || null,
        },
      })

      await tx.inventoryMovement.create({
        data: {
          clinicId,
          inventoryItemId: newItem.id,
          type: InventoryMovementType.IN,
          productNameSnapshot: newItem.name,
          lotSnapshot: newItem.lot,
          quantity: totalQuantity,
          unit: newItem.contentUnit,
          reason: `Cadastro inicial · lote ${newItem.lot}`,
          createdByUserId: userId,
        },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.INVENTORY,
          entityId: newItem.id,
          action: ClinicActivityAction.INVENTORY_CREATED,
        },
      })

      return { product: newItem }
    })

    return reply.status(201).send({ product })
  })

  // POST /api/inventory/:id/restock (Reposição do mesmo lote)
  fastify.post("/inventory/:id/restock", async (request, reply) => {
    const { id } = request.params as { id: string }
    const restockSchema = z.object({
      packs: z.number().positive("Número de caixas deve ser positivo"),
    })

    const parseResult = restockSchema.safeParse(request.body)
    if (!parseResult.success) {
      return reply.status(400).send({
        error: { code: "INVALID_INPUT", message: "Informe a quantidade de caixas." },
      })
    }

    const { packs } = parseResult.data
    const clinicId = request.clinic!.id
    const userId = request.user!.id

    const item = await prisma.inventoryItem.findFirst({
      where: { id, clinicId, archivedAt: null },
    })

    if (!item) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Item de estoque não encontrado." },
      })
    }

    const addedQuantity = Number(item.contentPerPack) * packs

    const updated = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.inventoryItem.update({
        where: { id },
        data: {
          quantity: { increment: addedQuantity },
        },
      })

      await tx.inventoryMovement.create({
        data: {
          clinicId,
          inventoryItemId: id,
          type: InventoryMovementType.IN,
          productNameSnapshot: item.name,
          lotSnapshot: item.lot,
          quantity: addedQuantity,
          unit: item.contentUnit,
          reason: `Reposição de estoque · ${packs} ${item.packLabel}`,
          createdByUserId: userId,
        },
      })

      await tx.clinicActivityLog.create({
        data: {
          clinicId,
          userId,
          entityType: ClinicActivityEntityType.INVENTORY,
          entityId: id,
          action: ClinicActivityAction.INVENTORY_RESTOCKED,
        },
      })

      return updatedItem
    })

    return { product: updated, message: "Estoque reposto com sucesso." }
  })
}
