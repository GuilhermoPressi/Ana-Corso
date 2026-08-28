import { AdminAuditAction, AuditActorType, SystemRole } from "@prisma/client"
import { prisma } from "../db.js"

async function main() {
  const emailArg = process.argv[2]
  if (!emailArg) {
    console.error("\n❌ Erro: Informe o e-mail do usuário que será promovido a Administrador.")
    console.error("Exemplo de uso: npm run admin:promote -- usuario@exemplo.com\n")
    process.exit(1)
  }

  // 5. Email Normalization
  const email = emailArg.trim().toLowerCase()

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    console.error(`\n❌ Erro: Usuário com o e-mail "${email}" não foi encontrado no banco de dados.\n`)
    process.exit(1)
  }

  if (user.systemRole === SystemRole.ADMIN) {
    console.log(`\nℹ️ O usuário ${user.name} (${user.email}) já possui perfil de Administrador (systemRole = ADMIN).\n`)
    process.exit(0)
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { systemRole: SystemRole.ADMIN },
    })

    await tx.adminAuditLog.create({
      data: {
        actorType: AuditActorType.SYSTEM,
        adminUserId: null,
        targetUserId: user.id,
        action: AdminAuditAction.USER_PROMOTED,
        metadata: { promotedBy: "CLI_SCRIPT" },
      },
    })
  })

  console.log(`\n✅ SUCESSO: O usuário ${user.name} (${user.email}) foi promovido a Administrador do Sistema (systemRole = ADMIN)!\n`)
}

main()
  .catch((err) => {
    console.error("❌ Falha na execução do script:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
