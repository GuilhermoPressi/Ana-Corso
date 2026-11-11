"""Etapa 1: busca vlogs de empreendedor (BR+EUA), mede indice = views / mediana(ultimos 20 videos longos do canal).
Saidas: pesquisa/busca_bruta.json, pesquisa/canais.json, pesquisa/candidatos.csv
Somente metadados publicos de listagem (flat). Sem download de video."""
import json,subprocess,statistics,csv,os,re,sys,datetime
from concurrent.futures import ThreadPoolExecutor
P=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
YTDLP=sys.argv[1]
QUERIES=[
 # BR
 "vlog empresário rotina","um dia na vida de um empresário","rotina de empresário vlog","bastidores da minha empresa vlog",
 "vlog infoprodutor","vlog marketing digital empresário","dia na vida empreendedor digital","vlog agência de marketing bastidores",
 "semana de um empresário vlog","vlog empreendedor faturamento","vlog lançamento infoproduto bastidores","24 horas com empresário",
 "vlog dono de empresa","rotina CEO vlog brasil","vlog low ticket","vlog tráfego pago empresário",
 # EUA
 "day in the life entrepreneur vlog","day in the life business owner","day in the life CEO vlog","week in my life entrepreneur",
 "behind the scenes of my business vlog","day in the life marketing agency owner","day in the life online business owner",
 "realistic day in the life founder","building my business vlog","day in my life running a 7 figure business",
]
def run(args):
    r=subprocess.run([YTDLP,'--flat-playlist','--extractor-args','youtubetab:approximate_date','-J',*args],capture_output=True,text=True,timeout=300)
    try: return json.loads(r.stdout)
    except Exception: return None
def search(q):
    d=run([f'ytsearch40:{q}']); return [(q,e) for e in (d or {}).get('entries',[]) if e]
VLOG=re.compile(r'vlog|day in (the|my) life|dia na (minha )?vida|rotina|bastidor|behind the scenes|week in (the|my) life|semana (na|da|de|com)|24 ?h|24 horas|12 horas|um dia (com|de|na|como)|routine|a day with|my life as|a week with|spend a .*day with',re.I)
BIZ=re.compile(r'empres|empreend|neg[oó]cio|\\bceo\\b|founder|business|entrepreneur|agency|ag[eê]ncia|infoprod|marketing|startup|figure|millionaire|milion[aá]ri|milh[aãõ]|fatur|dono|owner|company|empresa|seller|vendas|tr[aá]fego|lan[cç]amento|e-?commerce|dropship|saas|opera[cç][aã]o|escrit[oó]rio|office|launch|\\$\\d|R\\$',re.I)
os.makedirs(f'{P}/pesquisa',exist_ok=True)
hits=[]
with ThreadPoolExecutor(6) as ex:
    for r in ex.map(search,QUERIES): hits+=r
json.dump([{'q':q,'id':e.get('id'),'title':e.get('title'),'channel':e.get('channel'),'channel_id':e.get('channel_id'),'views':e.get('view_count'),'dur':e.get('duration')} for q,e in hits],open(f'{P}/pesquisa/busca_bruta.json','w'),ensure_ascii=False,indent=0)
chans={}
for q,e in hits:
    t=e.get('title') or ''
    if e.get('channel_id') and (e.get('duration') or 0)>=180 and VLOG.search(t) and BIZ.search(t): chans.setdefault(e['channel_id'],e.get('channel'))
print('canais',len(chans),flush=True)
def scan(cid):
    d=run(['--playlist-end','80',f'https://www.youtube.com/channel/{cid}/videos'])
    if not d: return cid,None
    ents=[e for e in d.get('entries',[]) if e and e.get('view_count') is not None and (e.get('duration') or 0)>=60]
    return cid,{'channel':d.get('channel'),'subs':d.get('channel_follower_count'),'videos':[{'id':e['id'],'title':e.get('title'),'views':e['view_count'],'dur':e.get('duration'),'date':(e.get('upload_date') or (__import__('datetime').datetime.fromtimestamp(e["timestamp"],__import__("datetime").UTC).strftime('%Y%m%d') if e.get('timestamp') else None))} for e in ents]}
data={}
with ThreadPoolExecutor(6) as ex:
    for cid,v in ex.map(scan,list(chans)):
        if v: data[cid]=v
json.dump(data,open(f'{P}/pesquisa/canais.json','w'),ensure_ascii=False)
cut=(datetime.date.today()-datetime.timedelta(days=730)).strftime('%Y%m%d')
rows=[]
for cid,c in data.items():
    v=c['videos']
    if len(v)<10: continue
    med=statistics.median([x['views'] for x in v[:20]])
    if med<=0: continue
    for x in v:
        if not (VLOG.search(x['title'] or '') and BIZ.search(x['title'] or '')): continue
        if (x['dur'] or 0)<240: continue
        if not x['date'] or x['date']<cut: continue
        rows.append({'canal':c['channel'],'inscritos':c['subs'],'video':x['title'],'data_aprox':x['date'],'duracao_s':x['dur'],'views':x['views'],'mediana_canal_20':med,'indice':round(x['views']/med,2),'link':f"https://www.youtube.com/watch?v={x['id']}",'channel_id':cid})
rows.sort(key=lambda r:-r['indice'])
with open(f'{P}/pesquisa/candidatos.csv','w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
print('linhas',len(rows))
