"use client";

import { useMemo, useState } from "react";
import type { ReactNode, ChangeEvent } from "react";
import type {
  Demo716Payload, DemoSubject, SubjectStats, MentionYear,
} from "@/lib/subjects/demo716-types";

type Category = "A" | "B" | "C" | "D" | "E" | "F";
type Metric = { id: number; title: string; explanation: string; source: "Simulado" | "Oficial" | "Guías" | "Mixto" | "Pendiente" };
const CATEGORIES: { key: Category; short: string; name: string; metrics: Metric[] }[] = [
  { key: "A", short: "Resultados", name: "Resultados académicos históricos", metrics: [
    {id:1,title:"Nota media por asignatura",explanation:"Calificaciones numéricas de los resultados sintéticos presentados, sin incluir los no presentados.",source:"Simulado"},
    {id:2,title:"Distribución de notas",explanation:"Número de suspensos y notas entre 5–6,9, 7–8,9 y 9–10. Se excluyen no presentados.",source:"Simulado"},
    {id:3,title:"Tasa de aprobados",explanation:"Aprobados sobre el total de registros, incluyendo no presentados.",source:"Simulado"},
    {id:4,title:"Mediana de calificaciones",explanation:"Hace falta ampliar la agregación con percentiles exactos.",source:"Pendiente"},
    {id:5,title:"Sobresalientes",explanation:"Proporción de notas desde 9 sobre resultados presentados.",source:"Simulado"},
    {id:6,title:"No presentados",explanation:"Porcentaje de registros sin presentación a evaluación.",source:"Simulado"},
    {id:7,title:"Evolución anual de las notas",explanation:"Evolución agrupada por año de elección de mención simulado; no equivale a matrículas históricas reales.",source:"Simulado"},
    {id:8,title:"Dispersión de calificaciones",explanation:"Desviación típica de calificaciones numéricas, calculada por asignatura.",source:"Simulado"},
    {id:9,title:"Tamaño de muestra",explanation:"Número de observaciones simuladas detrás de cada asignatura.",source:"Simulado"},
  ]},
  { key:"B", short:"Esfuerzo", name:"Dificultad, dedicación y evaluación", metrics:[
    {id:10,title:"Horas semanales declaradas",explanation:"Horas ficticias por observación y semana; no deben confundirse con horas ECTS oficiales.",source:"Simulado"},
    {id:11,title:"Dificultad percibida",explanation:"Media de las respuestas ficticias, en escala 1–5.",source:"Simulado"},
    {id:12,title:"Créditos ECTS",explanation:"Créditos publicados en el catálogo oficial.",source:"Oficial"},
    {id:13,title:"Sistema de evaluación",explanation:"Texto de evaluación de la guía; los porcentajes detectados no son todavía una descomposición homogénea.",source:"Guías"},
    {id:14,title:"Evaluación continua",explanation:"Número de guías que la mencionan. No representa su porcentaje de nota.",source:"Guías"},
    {id:15,title:"Modalidades de aprendizaje",explanation:"Presencia de exámenes, prácticas, proyectos y trabajos en las guías.",source:"Guías"},
    {id:16,title:"Frecuencia de entregas",explanation:"Las guías no ofrecen un calendario de entregas normalizado.",source:"Pendiente"},
    {id:17,title:"Trabajo individual o en grupo",explanation:"Menciones textuales al trabajo en grupo; no son porcentajes de dedicación.",source:"Guías"},
  ]},
  { key:"C", short:"Formación", name:"Contenidos, competencias y proyección", metrics:[
    {id:18,title:"Áreas de conocimiento",explanation:"Etiquetas temáticas detectadas en programas oficiales; clasificación orientativa, no oficial.",source:"Mixto"},
    {id:19,title:"Resultados de aprendizaje",explanation:"Qué declara aprender el estudiante según cada guía docente.",source:"Guías"},
    {id:20,title:"Solapamiento de temarios",explanation:"Coincidencia de vocabulario entre programas seleccionados; no equivale a convalidaciones.",source:"Mixto"},
    {id:21,title:"Tecnologías mencionadas",explanation:"Apariciones de tecnologías reconocibles en los temarios.",source:"Guías"},
    {id:22,title:"Orientación profesional",explanation:"Sin relación profesional oficial sistematizada para todas las materias.",source:"Pendiente"},
    {id:23,title:"Conocimientos previos recomendados",explanation:"Extractos de la guía. No equivalen necesariamente a prerrequisitos obligatorios.",source:"Guías"},
    {id:24,title:"Relación temática con el TFG",explanation:"Sin catálogo estructurado de líneas de TFG con que cruzar asignaturas.",source:"Pendiente"},
    {id:25,title:"Cobertura de ámbitos seleccionados",explanation:"Número de asignaturas por tema detectado dentro de tu selección.",source:"Mixto"},
  ]},
  { key:"D", short:"Experiencias", name:"Experiencias y elecciones de estudiantes", metrics:[
    {id:26,title:"Satisfacción general",explanation:"Opiniones sintéticas en escala 1–5, solo registros con respuesta.",source:"Simulado"},
    {id:27,title:"Volvería a elegirla",explanation:"Porcentaje de sí entre las respuestas ficticias recibidas.",source:"Simulado"},
    {id:28,title:"Popularidad de las optativas",explanation:"Número de registros simulados en cada asignatura.",source:"Simulado"},
    {id:29,title:"Popularidad por año",explanation:"Serie sintética por año de elección de mención.",source:"Simulado"},
    {id:30,title:"Motivos de elección",explanation:"Distribución de motivos declarados por estudiantes ficticios.",source:"Simulado"},
    {id:31,title:"Expectativa frente a experiencia",explanation:"No existe todavía una medición separada de expectativas previas.",source:"Pendiente"},
    {id:32,title:"Optativas elegidas conjuntamente",explanation:"Requiere agregación de coelección con anonimización y recuentos correctos.",source:"Pendiente"},
    {id:33,title:"Satisfacción por interés previo",explanation:"Comparación de respuestas agrupadas por intereses ficticios de los estudiantes.",source:"Simulado"},
    {id:46,title:"Estudiantes por mención y año",explanation:"Distribución temporal de cohortes sintéticas, calibradas con referencias históricas; no son matrículas reales.",source:"Simulado"},
  ]},
  { key:"E", short:"Organización", name:"Organización y compatibilidad", metrics:[
    {id:34,title:"Optativas por semestre",explanation:"Periodos declarados en el catálogo oficial; los desconocidos se muestran aparte.",source:"Oficial"},
    {id:35,title:"Horario semanal",explanation:"Faltan franjas docentes verificadas para el curso y grupo.",source:"Pendiente"},
    {id:36,title:"Conflictos horarios",explanation:"Sin horarios de grupos no se pueden detectar coincidencias reales.",source:"Pendiente"},
    {id:37,title:"Entregas y exámenes",explanation:"Falta el calendario detallado de pruebas de evaluación.",source:"Pendiente"},
    {id:38,title:"Carga de créditos seleccionados",explanation:"Suma de ECTS oficiales de tus asignaturas marcadas, sin proponer una matrícula.",source:"Oficial"},
    {id:39,title:"Oferta vigente",explanation:"Estado del catálogo 2026-2027, sin inferir plazas disponibles.",source:"Oficial"},
    {id:40,title:"Condiciones previas",explanation:"Recomendaciones del texto docente, que no deben confundirse con restricciones de matrícula.",source:"Guías"},
  ]},
  { key:"F", short:"Relaciones", name:"Análisis cruzados", metrics:[
    {id:41,title:"Nota frente a dificultad",explanation:"Relaciona dos medias sintéticas por optativa; correlación no significa causalidad.",source:"Simulado"},
    {id:42,title:"Horas frente a satisfacción",explanation:"Relaciona dedicación declarada y valoración sintética.",source:"Simulado"},
    {id:43,title:"Rendimiento por antecedentes",explanation:"Requeriría un agregado anonimizado de notas previas agrupadas por estudiante.",source:"Pendiente"},
    {id:44,title:"Notas, satisfacción y muestra",explanation:"Gráfico de dispersión: ejes de nota y satisfacción, tamaño asociado al número de observaciones.",source:"Simulado"},
    {id:45,title:"Carga conjunta de optativas",explanation:"Suma de créditos oficiales y de horas medias simuladas; las horas son aproximaciones no acumulables como obligación curricular.",source:"Mixto"},
  ]},
];
const nf = new Intl.NumberFormat("es-ES", { maximumFractionDigits:1 });
const ni = new Intl.NumberFormat("es-ES", { maximumFractionDigits:0 });
const fmt = (n:number) => nf.format(n);
const percent = (a:number,b:number) => b>0 ? a*100/b : 0;
const choose = (s:DemoSubject) => s.name.length>35 ? `${s.name.slice(0,34)}…` : s.name;
const names:Record<string,string> = { "computacion":"Computación", "software":"Software", "datos":"Datos", "infraestructura":"Infraestructura", "general":"General" };

const empty = () => ({n:0,presented:0,passed:0,failed:0,absent:0,gradeSum:0,gradeSqSum:0,grade0:0,grade5:0,grade7:0,grade9:0,hoursSum:0,difficultySum:0,difficultyN:0,satisfactionSum:0,satisfactionN:0,repeatYes:0,repeatN:0});
type Totals = ReturnType<typeof empty>;
function summarize(rows: SubjectStats[]): Totals {
  const t=empty();
  for(const r of rows) for(const k of Object.keys(t) as (keyof Totals)[]) t[k]+=r[k];
  return t;
}
const avgGrade = (s:Totals) => s.presented ? s.gradeSum/s.presented : null;
const avgHours = (s:Totals) => s.n ? s.hoursSum/s.n : null;
const avgDifficulty = (s:Totals) => s.difficultyN ? s.difficultySum/s.difficultyN : null;
const avgSatisfaction = (s:Totals) => s.satisfactionN ? s.satisfactionSum/s.satisfactionN : null;
const stdGrade=(s:Totals)=>s.presented? Math.sqrt(Math.max(0,s.gradeSqSum/s.presented-Math.pow(s.gradeSum/s.presented,2))):null;
const numText=(x:number|null, suffix="")=> x === null ? "Sin datos" : `${fmt(x)}${suffix}`;

function Panel({metric,children,small=false}:{metric:Metric;children:ReactNode;small?:boolean}) {
  return <section className={`min-w-0 border border-[var(--color-border)] bg-[var(--color-bg-card)] ${small?"p-4":"p-5"}`}>
    <div className="mb-4 flex items-start justify-between gap-2">
      <div className="min-w-0"><p className="font-mono text-[10px] tracking-widest text-[var(--color-subjects)]">{String(metric.id).padStart(2,"0")} / INDICADOR</p>
        <h3 className="mt-1 font-heading text-base font-semibold leading-snug md:text-lg">{metric.title}</h3></div>
      <span className={`shrink-0 border px-2 py-1 text-[10px] ${metric.source==="Pendiente"?"border-amber-500/30 text-amber-300":"border-[var(--color-border-light)] text-[var(--color-fg-dim)]"}`}>{metric.source}</span>
    </div>
    <div className="min-h-20">{children}</div>
    <p className="mt-4 border-t border-[var(--color-border)] pt-3 text-[11px] leading-relaxed text-[var(--color-fg-dim)]">{metric.explanation}</p>
  </section>;
}
function Empty({why}:{why?:string}) {
  return <div className="flex min-h-32 items-center justify-center border border-dashed border-[var(--color-border-light)] px-5 text-center text-sm text-[var(--color-fg-dim)]">{why??"Datos insuficientes con estos filtros."}</div>;
}
function BarChart({values,unit="",maxRows=9,highlight=[]}:{values:{id:string;name:string;value:number|null;n?:number}[];unit?:string;maxRows?:number;highlight?:string[]}){
  const usable=values.filter(v=>v.value!==null) as {id:string;name:string;value:number;n?:number}[];
  if(!usable.length) return <Empty/>;
  const vmax=Math.max(...usable.map(v=>v.value),0.01);
  return <div className="max-h-[320px] space-y-2.5 overflow-y-auto pr-1" role="img" aria-label={`Comparación de ${usable.length} asignaturas`}>
    {usable.slice(0,maxRows===-1?undefined:maxRows).map(v=><div key={v.id} title={`${v.name}: ${fmt(v.value)}${unit}${v.n!==undefined?` · n=${ni.format(v.n)}`:""}`}>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-xs"><span className={`min-w-0 truncate ${highlight.includes(v.id)?"font-semibold text-[var(--color-subjects)]":"text-[var(--color-fg)]"}`}>{v.name}</span><span className="shrink-0 font-mono tabular-nums">{fmt(v.value)}{unit}</span></div>
      <div className="h-2 overflow-hidden rounded-sm bg-white/10"><div className={`h-full ${highlight.includes(v.id)?"bg-[var(--color-subjects)]":"bg-sky-400/50"}`} style={{width:`${Math.min(100,percent(v.value,vmax))}%`}}/></div>
    </div>)}
    {maxRows>0&&usable.length>maxRows&&<p className="text-xs text-[var(--color-fg-dim)]">Mostradas {maxRows} de {usable.length}. Filtra por mención o selecciona asignaturas para reducir la lista.</p>}
  </div>;
}
function Breakdown({values}:{values:{label:string;n:number;color:string}[]}){
  const total=values.reduce((a,b)=>a+b.n,0);
  return <div><div className="flex h-7 overflow-hidden rounded-sm bg-white/10" role="img" aria-label={values.map(v=>`${v.label}: ${ni.format(v.n)}`).join(", ")}>
    {values.map(v=><div key={v.label} title={`${v.label}: ${ni.format(v.n)} (${fmt(percent(v.n,total))} %) `} style={{width:`${percent(v.n,total)}%`,backgroundColor:v.color}}/>)}
    </div><div className="mt-4 grid grid-cols-2 gap-2 text-xs">{values.map(v=><div key={v.label} className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0" style={{backgroundColor:v.color}}/>{v.label}: <strong className="ml-auto">{fmt(percent(v.n,total))}%</strong></div>)}</div>
  </div>;
}
function Lines({series,yMax=10}:{series:{name:string;values:{x:string;y:number|null}[];color:string}[];yMax?:number}){
  const labels=[...new Set(series.flatMap(s=>s.values.map(v=>v.x)))].sort();
  if(!labels.length) return <Empty/>;
  const W=520,H=205,pad=27;
  const xx=(i:number)=>pad+(W-2*pad)*(labels.length<=1?0.5:i/(labels.length-1));
  const yy=(v:number)=>H-pad-(H-2*pad)*Math.min(1,Math.max(0,v/yMax));
  return <div className="w-full"><svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Evolución por cursos simulados" role="img">
    {[0,.25,.5,.75,1].map(x=><g key={x}><line x1={pad} x2={W-pad} y1={yy(x*yMax)} y2={yy(x*yMax)} stroke="currentColor" strokeOpacity="0.14"/><text x="0" y={yy(x*yMax)+4} fill="currentColor" fontSize="11" opacity=".6">{fmt(x*yMax)}</text></g>)}
    {series.map(s=><g key={s.name}><polyline fill="none" stroke={s.color} strokeWidth="2.5" points={labels.map((label,i)=>{const v=s.values.find(v=>v.x===label)?.y;return v===null||v===undefined?null:`${xx(i)},${yy(v)}`}).filter(Boolean).join(" ")}/>
      {labels.map((label,i)=>{const v=s.values.find(v=>v.x===label)?.y;return v===null||v===undefined?null:<circle key={label} cx={xx(i)} cy={yy(v)} r="3" fill={s.color}><title>{`${s.name} · ${label}: ${fmt(v)}`}</title></circle>})}</g>)}
    {labels.filter((_,i)=>i%Math.max(1,Math.ceil(labels.length/5))===0).map(label=><text key={label} x={xx(labels.indexOf(label))} y={H-5} fontSize="10" textAnchor="middle" fill="currentColor" opacity=".65">{label.slice(0,4)}</text>)}
  </svg><div className="mt-2 flex flex-wrap gap-3 text-[11px]">{series.map(s=><span key={s.name} className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2" style={{background:s.color}}/>{s.name}</span>)}</div></div>;
}
function Scatter({points,xLabel,yLabel,xMax,yMax,scale=false}:{points:{name:string;x:number;y:number;n:number}[];xLabel:string;yLabel:string;xMax:number;yMax:number;scale?:boolean}){
  const W=500,H=225,p=38;
  if(!points.length) return <Empty/>;
  return <div><svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${xLabel} frente a ${yLabel}`}>
    <line x1={p} x2={W-8} y1={H-p} y2={H-p} stroke="currentColor" opacity=".4"/><line x1={p} x2={p} y1="8" y2={H-p} stroke="currentColor" opacity=".4"/>
    {points.map((d,i)=><circle key={`${d.name}-${i}`} cx={p+(W-p-12)*d.x/xMax} cy={H-p-(H-p-14)*d.y/yMax} r={scale?Math.max(3,Math.min(11,Math.sqrt(d.n)/6)):5} fill="var(--color-subjects)" fillOpacity=".65" stroke="var(--color-bg-card)" strokeWidth="1"><title>{`${d.name} · ${xLabel}: ${fmt(d.x)} · ${yLabel}: ${fmt(d.y)} · n=${ni.format(d.n)}`}</title></circle>)}
    <text x={W/2} y={H-3} textAnchor="middle" fill="currentColor" opacity=".7" fontSize="12">{xLabel}</text><text transform={`translate(14,${H/2}) rotate(-90)`} fill="currentColor" opacity=".7" textAnchor="middle" fontSize="12">{yLabel}</text>
  </svg><p className="mt-2 text-[11px] text-[var(--color-fg-dim)]">Pasa el cursor sobre cada punto para ver la asignatura y su muestra.</p></div>;
}
function Transcript({text,sourceUrl,kind="Guía oficial"}:{text:string;sourceUrl?:string;kind?:string}){
  return <div className="rounded-sm bg-white/[0.035] p-4 text-xs leading-relaxed text-[var(--color-fg-dim)]"><p className="max-h-40 overflow-auto whitespace-pre-line">{text||"No se ha recuperado esta sección."}</p>{sourceUrl&&<a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[var(--color-subjects)] hover:underline">Abrir {kind} ↗</a>}</div>;
}
function SelectionList({subjects,selected,toggle}:{subjects:DemoSubject[];selected:string[];toggle:(id:string)=>void}){
  return <div className="max-h-80 overflow-y-auto divide-y divide-[var(--color-border)]">{subjects.map(s=><label key={s.id} className="flex cursor-pointer items-center gap-3 py-2.5 text-sm">
    <input type="checkbox" className="h-4 w-4 shrink-0 accent-cyan-400" checked={selected.includes(s.id)} disabled={!selected.includes(s.id)&&selected.length>=4} onChange={()=>toggle(s.id)}/>
    <span className="min-w-0 flex-1 truncate">{s.name}</span>
    <span className="shrink-0 font-mono text-xs text-[var(--color-fg-dim)]">{fmt(s.ects)} ECTS</span>
  </label>)}</div>;
}
const LOOKUPS: {name:string;re:RegExp}[] = [
  {name:"Inteligencia artificial",re:/aprendizaje automático|inteligencia artificial|visión por computador|redes neuronales|machine learning|robótica/i},
  {name:"Ingeniería del software",re:/ingeniería de requisitos|software|arquitectura|verificación|validación|metodologías ágiles/i},
  {name:"Datos",re:/bases de datos|minería de datos|almacenes de datos|recuperación de información|data mining/i},
  {name:"Sistemas y redes",re:/redes|sistemas operativos|virtualización|servidores|procesadores|centros de datos/i},
  {name:"Interfaces y multimedia",re:/interfaz|multimedia|videojuegos|gráfica|experiencia de usuario/i},
];
const TECHNOLOGIES=["Python","Java","JavaScript","SQL","Docker","Linux","C++","C#","HTML","CSS","PostgreSQL","React","TensorFlow","Kubernetes","Git","Android","XML","REST","Spark","Hadoop"];
function textTopics(s:DemoSubject){const text=`${s.name} ${s.guide?.program??""}`;return LOOKUPS.filter(v=>v.re.test(text)).map(v=>v.name);}
function technologies(s:DemoSubject){const text=s.guide?.program??"";return TECHNOLOGIES.filter(t=>new RegExp(`\\b${t.replace(/[+]/g,"\\+")}\\b`,"i").test(text));}
function keywordSet(s:DemoSubject){return new Set((s.guide?.program??"").toLowerCase().match(/[a-záéíóúñ]{5,}/g)?.filter(w=>!new Set(["para","sobre","entre","mediante","estos","estas","tiene","forma","sistemas","clases","desarrollo","estudio","alumnos"]).has(w))??[]);}
function sharedWords(a:DemoSubject,b:DemoSubject){const x=keywordSet(a),y=keywordSet(b);if(!x.size||!y.size)return null;let common=0;for(const w of x)if(y.has(w))common++;return percent(common,x.size+y.size-common);}

export function SubjectsDemoDashboard({data}:{data:Demo716Payload}){
  const [category,setCategory]=useState<Category>("A");
  const [mention,setMention]=useState("all");
  const [cohort,setCohort]=useState("all");
  const [onlySelected,setOnlySelected]=useState(false);
  const [selection,setSelection]=useState<string[]>(()=>data.subjects.filter(s=>["30231","30243","30255"].includes(s.code)).map(s=>s.id));
  const [search,setSearch]=useState("");
  const [detailId,setDetailId]=useState<string>("");
  const subjectById=useMemo(()=>new Map(data.subjects.map(s=>[s.id,s])),[data.subjects]);
  const selectedSubjects=selection.map(id=>subjectById.get(id)).filter((s):s is DemoSubject=>Boolean(s));
  const filteredSubjects=data.subjects.filter(s=>{
    if(onlySelected&&!selection.includes(s.id))return false;
    if(search&&!`${s.name} ${s.code}`.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")))return false;
    return true;
  });
  const baseRows=useMemo(()=>data.stats.filter(r=>(mention==="all"||r.mentionCode===mention)&&(cohort==="all"||r.cohort===cohort)),[data.stats,mention,cohort]);
  const bySubject=useMemo(()=>{const m=new Map<string,Totals>();for(const s of data.subjects)m.set(s.id,summarize(baseRows.filter(r=>r.subjectId===s.id)));return m;},[baseRows,data.subjects]);
  const entries=filteredSubjects.map(s=>({s,t:bySubject.get(s.id)??empty()}));
  const visible=selection.length? selectedSubjects:filteredSubjects.slice(0,4);
  const focus=detailId?subjectById.get(detailId):selectedSubjects[0];
  const current=CATEGORIES.find(c=>c.key===category)!;
  const years=[...new Set(data.mentionYears.map(y=>y.year))].sort();
  const catsColors=["#32d1d8","#7aa6ff","#b58bf7","#f0b66a","#9eacbf"];
  const toggle=(id:string)=>setSelection(old=>old.includes(id)?old.filter(v=>v!==id):old.length>=4?old:[...old,id]);
  const metric=(id:number)=>current.metrics.find(m=>m.id===id)!;
  const hist=visible.length?bySubject.get(visible[0].id)??empty():empty();
  const bars=(calc:(s:DemoSubject,t:Totals)=>number|null,unit="",take=14)=><BarChart unit={unit} maxRows={take} highlight={selection} values={entries.map(({s,t})=>({id:s.id,name:s.name,value:calc(s,t),n:t.n}))}/>;
  const displayYears=years.map((y,i)=>({year:y,index:i}));
  const annualSubjectLines=(get:(t:Totals)=>number|null,max=10)=>visible.slice(0,4).map((s,i)=>({name:choose(s),color:catsColors[i],values:displayYears.map(({year})=>{const t=summarize(data.stats.filter(r=>r.subjectId===s.id&&(mention==="all"||r.mentionCode===mention)&&r.cohort===year));return {x:year,y:get(t)};})}));
  const points=(f:(s:DemoSubject,t:Totals)=>{x:number|null;y:number|null})=>entries.flatMap(({s,t})=>{const z=f(s,t);return z.x===null||z.y===null?[]:[{name:s.name,x:z.x,y:z.y,n:t.n}];});
  const guideCount=data.subjects.filter(s=>s.guide!==null).length;
  const eligibleCount=data.subjects.filter(s=>s.availability==="listed").length;
  const selectedCredits=selectedSubjects.reduce((a,s)=>a+s.ects,0);

  function panelContent(id:number):ReactNode{
    switch(id){
      case 1:return bars((_,t)=>avgGrade(t)," / 10",-1);
      case 2:{const off=data.official.find(v=>v.subjectId===visible[0]?.id);return <><p className="mb-3 text-sm font-medium">{visible[0]?.name??"Selecciona una optativa"}</p><p className="mb-2 text-xs text-[var(--color-fg-dim)]">Resultados individuales sintéticos · n={ni.format(hist.presented)} presentados</p><Breakdown values={[{label:"Suspenso",n:hist.grade0,color:"#e48a85"},{label:"5–6,9",n:hist.grade5,color:"#e4bd6b"},{label:"7–8,9",n:hist.grade7,color:"#67b9cb"},{label:"9–10",n:hist.grade9,color:"#67d6ad"}]}/>{off&&<div className="mt-5 border-t border-[var(--color-border)] pt-4"><p className="mb-3 text-xs text-[var(--color-fg-dim)]">Referencia oficial agregada {off.course} · n={ni.format(off.failed+off.pass+off.merit+off.distinction+off.honours)} presentados</p><Breakdown values={[{label:"Suspenso",n:off.failed,color:"#e48a85"},{label:"Aprobado",n:off.pass,color:"#e4bd6b"},{label:"Notable",n:off.merit,color:"#67b9cb"},{label:"Sobresal. + MH",n:off.distinction+off.honours,color:"#67d6ad"}]}/><a href={off.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs text-[var(--color-subjects)]">Ver informe oficial ↗</a></div>}</>;}

      case 3:return bars((_,t)=>t.n?percent(t.passed,t.n):null," %",-1);
      case 5:return bars((_,t)=>t.presented?percent(t.grade9,t.presented):null," %",-1);
      case 6:return bars((_,t)=>t.n?percent(t.absent,t.n):null," %",-1);
      case 7:return <Lines series={annualSubjectLines(avgGrade)} yMax={10}/>;
      case 8:return bars((_,t)=>stdGrade(t)," pts",-1);
      case 9:return bars((_,t)=>t.n||null,"",-1);
      case 10:return bars((_,t)=>avgHours(t)," h/sem",-1);
      case 11:return bars((_,t)=>avgDifficulty(t)," / 5",-1);
      case 12:return bars(s=>s.ects," ECTS",-1);
      case 13:return focus?.guide?<><p className="mb-3 text-sm font-medium">{focus.name}</p><Transcript text={focus.guide.assessment} sourceUrl={focus.guide.sourceUrl}/>{focus.guide.multicenter&&<p className="mt-2 text-xs text-amber-300">Guía multicentro: revisa qué partes se aplican a EINA.</p>}</>:<Empty why="Carga el esquema de guías para ver los criterios de evaluación."/>;
      case 14:return <p className="text-3xl font-display text-[var(--color-subjects)]">{data.subjects.filter(s=>s.guide?.signals.some(v=>/continua/i.test(v))).length} <span className="text-base text-[var(--color-fg-dim)]">/ {guideCount} guías</span></p>;
      case 15:{const labels=["Examen","Prácticas","Trabajos","Proyectos","Trabajo en grupo","Evaluación continua"];return <BarChart maxRows={-1} values={labels.map(v=>({id:v,name:v,value:data.subjects.filter(s=>s.guide?.signals.some(k=>k.toLowerCase()===v.toLowerCase())).length}))}/>;}
      case 17:return <p className="font-display text-3xl text-[var(--color-subjects)]">{data.subjects.filter(s=>s.guide?.signals.some(v=>/grupo/i.test(v))).length} <span className="text-base text-[var(--color-fg-dim)]">guías mencionan grupo</span></p>;
      case 18:return <BarChart maxRows={-1} values={LOOKUPS.map(k=>({id:k.name,name:k.name,value:data.subjects.filter(s=>textTopics(s).includes(k.name)).length}))}/>;
      case 19:return focus?.guide?<><p className="mb-2 text-sm font-medium">{focus.name}</p><Transcript text={focus.guide.outcomes} sourceUrl={focus.guide.sourceUrl}/></>:<Empty why="Sin guías cargadas."/>;
      case 20:{const x=selectedSubjects;return x.length<2?<Empty why="Marca dos optativas para comparar su temario textual."/>:<BarChart maxRows={-1} unit=" %" values={x.flatMap((s,i)=>x.slice(i+1).map(other=>({id:`${s.id}${other.id}`,name:`${choose(s)} / ${choose(other)}`,value:sharedWords(s,other)})))}/>;}
      case 21:{const found=data.subjects.flatMap(s=>technologies(s));const counts=TECHNOLOGIES.map(t=>({id:t,name:t,value:found.filter(x=>x===t).length})).filter(x=>x.value);return counts.length?<BarChart values={counts} maxRows={-1}/>:<Empty why="Sin tecnologías reconocidas automáticamente en los temarios."/>;}
      case 23:return focus?.guide?<><p className="mb-2 text-sm font-medium">{focus.name}</p><Transcript text={focus.guide.basic} sourceUrl={focus.guide.sourceUrl}/></>:<Empty why="Sin ficha docente."/>;
      case 25:{const src=selectedSubjects.length?selectedSubjects:data.subjects;return <BarChart maxRows={-1} values={LOOKUPS.map(k=>({id:k.name,name:k.name,value:src.filter(s=>textTopics(s).includes(k.name)).length}))}/>;}
      case 26:return bars((_,t)=>avgSatisfaction(t)," / 5",-1);
      case 27:return bars((_,t)=>t.repeatN?percent(t.repeatYes,t.repeatN):null," %",-1);
      case 28:return bars((_,t)=>t.n||null,"",-1);
      case 29:return <Lines series={annualSubjectLines(t=>t.n||null)} yMax={Math.max(1,...annualSubjectLines(t=>t.n||null).flatMap(s=>s.values.map(v=>v.y??0)))*1.1}/>;
      case 30:{const rs=new Map<string,number>();for(const r of data.reasons)if((mention==="all"||r.mentionCode===mention)&&(cohort==="all"||r.cohort===cohort))rs.set(r.reason,(rs.get(r.reason)??0)+r.count);return <BarChart maxRows={-1} values={[...rs.entries()].map(([reason,value])=>({id:reason,name:reason.replaceAll("_"," "),value}))}/>;}
      case 33:return <BarChart maxRows={-1} unit=" / 5" values={data.interests.map(r=>({id:r.interest,name:names[r.interest]??r.interest,value:r.satisfaction,n:r.responses}))}/>;
      case 46:{const ys=years.map(year=>({year,parts:data.mentionYears.filter(z=>z.year===year)}));const largest=Math.max(...ys.map(y=>y.parts.reduce((a,b)=>a+b.n,0)),1);return <div className="space-y-2">{ys.map(y=><div key={y.year} className="flex items-center gap-2 text-xs"><span className="w-16 shrink-0 text-[var(--color-fg-dim)]">{y.year.slice(0,4)}</span><div className="flex h-5 min-w-0 flex-1 overflow-hidden bg-white/5" style={{maxWidth:`${percent(y.parts.reduce((a,b)=>a+b.n,0),largest)}%`}}>{data.mentions.map((m,i)=>{const n=y.parts.find(p=>p.mentionCode===m.code)?.n??0;return <div key={m.code} style={{width:`${percent(n,y.parts.reduce((a,b)=>a+b.n,0))}%`,backgroundColor:catsColors[i]}} title={`${y.year} · ${m.name}: ${ni.format(n)} alumnos ficticios`}/>})}</div><span className="w-12 shrink-0 text-right tabular-nums">{ni.format(y.parts.reduce((a,b)=>a+b.n,0))}</span></div>)}<div className="mt-3 flex flex-wrap gap-2 text-[10px]">{data.mentions.map((m,i)=><span key={m.code} className="flex items-center gap-1"><i className="h-2 w-2" style={{background:catsColors[i]}}/>{m.name}</span>)}</div></div>}
      case 34:return <Breakdown values={[{label:"Primer semestre",n:data.subjects.filter(s=>s.semester==="1").length,color:"#32d1d8"},{label:"Segundo semestre",n:data.subjects.filter(s=>s.semester==="2").length,color:"#7aa6ff"},{label:"Anual",n:data.subjects.filter(s=>s.semester==="annual").length,color:"#b58bf7"},{label:"Desconocido",n:data.subjects.filter(s=>!s.semester||!["1","2","annual"].includes(s.semester)).length,color:"#e4bd6b"}]}/>;
      case 38:return <><p className="font-display text-4xl text-[var(--color-subjects)]">{fmt(selectedCredits)} <span className="text-base">ECTS</span></p><p className="mt-3 text-sm text-[var(--color-fg-dim)]">{selectedSubjects.length} asignaturas seleccionadas. No implica matrícula válida ni certifica requisitos.</p><BarChart values={selectedSubjects.map(s=>({id:s.id,name:s.name,value:s.ects}))} maxRows={-1} unit=" ECTS"/></>;
      case 39:return <Breakdown values={[{label:"En catálogo sin aviso",n:eligibleCount,color:"#32d1d8"},{label:"No ofertada",n:data.subjects.length-eligibleCount,color:"#e4bd6b"}]}/>;
      case 40:return focus?.guide?<><p className="mb-2 text-sm font-medium">{focus.name}</p><Transcript text={focus.guide.basic} sourceUrl={focus.guide.sourceUrl}/></>:<Empty/>;
      case 41:return <Scatter points={points((_,t)=>({x:avgDifficulty(t),y:avgGrade(t)}))} xLabel="Dificultad /5" yLabel="Nota /10" xMax={5} yMax={10}/>;
      case 42:return <Scatter points={points((_,t)=>({x:avgHours(t),y:avgSatisfaction(t)}))} xLabel="Horas por semana" yLabel="Satisfacción /5" xMax={18} yMax={5}/>;
      case 44:return <Scatter points={points((_,t)=>({x:avgGrade(t),y:avgSatisfaction(t)}))} xLabel="Nota /10" yLabel="Satisfacción /5" xMax={10} yMax={5} scale/>;
      case 45:return <><div className="grid grid-cols-2 gap-3"><div className="border border-[var(--color-border-light)] p-4"><p className="text-[11px] text-[var(--color-fg-dim)]">ECTS oficiales</p><strong className="font-display text-3xl text-[var(--color-subjects)]">{fmt(selectedCredits)}</strong></div><div className="border border-[var(--color-border-light)] p-4"><p className="text-[11px] text-[var(--color-fg-dim)]">Suma orientativa de horas/sem</p><strong className="font-display text-3xl">{numText(selectedSubjects.some(s=>avgHours(bySubject.get(s.id)??empty())===null)?null:selectedSubjects.reduce((a,s)=>a+(avgHours(bySubject.get(s.id)??empty())??0),0))}</strong></div></div><p className="mt-3 text-xs text-[var(--color-fg-dim)]">Las dedicaciones provienen de declaraciones sintéticas; sumar medias no predice una carga individual.</p></>;
      default:return <Empty why="Indicador previsto en la especificación. Falta una fuente o una agregación compatible; no se fabrica un valor."/>;
    }
  }

  return <div className="space-y-7">
    <header className="relative overflow-hidden border border-[var(--color-border)] bg-[var(--color-bg-card)] px-6 py-7 md:px-9 md:py-9">
      <div className="pointer-events-none absolute -right-12 -top-20 h-60 w-60 rounded-full bg-[var(--color-subjects)]/10 blur-3xl"/>
      <p className="section-marker section-marker-subjects">DEMO · SISTEMA DE APOYO A LA DECISIÓN</p>
      <h1 className="font-display mt-4 text-4xl leading-tight md:text-6xl">OBSERVATORIO <span className="text-[var(--color-subjects)]">DE OPTATIVAS.</span></h1>
      <p className="mt-3 max-w-4xl text-sm leading-relaxed text-[var(--color-fg-dim)]">Grado en Ingeniería Informática · Escuela de Ingeniería y Arquitectura · UNIZAR · Plan {data.planCode} · 2026-2027. Explora evidencias y toma tu decisión: el sistema no elige por ti.</p>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px]"><span className="border border-[var(--color-border-light)] px-2.5 py-1.5">Catálogo y guías: oficiales</span><span className="border border-amber-400/35 bg-amber-400/5 px-2.5 py-1.5 text-amber-200">Notas individuales, encuestas y cohortes: simuladas</span><span className="border border-[var(--color-border-light)] px-2.5 py-1.5">31 referencias oficiales agregadas</span></div>
    </header>

    <section className="grid gap-px overflow-hidden border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2 xl:grid-cols-5">
      {[{label:"Optativas en catálogo",value:`${data.subjects.length}`,sub:"Incluye no ofertadas"},{label:"Estudiantes históricos demo",value:ni.format(data.syntheticStudents-1),sub:"Población sintética"},{label:"Resultados registrados",value:ni.format(data.syntheticResults),sub:"Todas las asignaturas"},{label:"Menciones",value:`${data.mentions.length}`,sub:"Según plan oficial"},{label:"Tu expediente demo",value:`${ni.format(data.demoPassed.reduce((a,b)=>a+b.ects,0))} ECTS`,sub:`${data.demoPassed.length} aprobadas ficticias`}].map(k=><div key={k.label} className="bg-[var(--color-bg-card)] px-5 py-5"><p className="text-[11px] leading-snug text-[var(--color-fg-dim)]">{k.label}</p><p className="mt-2 font-display text-2xl text-[var(--color-subjects)] md:text-3xl">{k.value}</p><p className="mt-1 text-[10px] text-[var(--color-fg-dim)]">{k.sub}</p></div>)}
    </section>

    <section className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 md:p-5" aria-label="Filtros de datos">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <label className="block text-xs text-[var(--color-fg-dim)]">Mención de la población ficticia
          <select className="mt-2 w-full border border-[var(--color-border-light)] bg-[var(--color-bg-darker)] p-3 text-sm text-[var(--color-fg)]" value={mention} onChange={(e: ChangeEvent<HTMLSelectElement>)=>setMention(e.target.value)}><option value="all">Todas las menciones</option>{data.mentions.map(m=><option key={m.code} value={m.code}>{m.name}</option>)}</select>
        </label>
        <label className="block text-xs text-[var(--color-fg-dim)]">Año de elección simulado
          <select className="mt-2 w-full border border-[var(--color-border-light)] bg-[var(--color-bg-darker)] p-3 text-sm text-[var(--color-fg)]" value={cohort} onChange={(e: ChangeEvent<HTMLSelectElement>)=>setCohort(e.target.value)}><option value="all">Todos los años</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
        </label>
        <button type="button" className="border border-[var(--color-border-light)] px-5 py-3 text-xs hover:border-[var(--color-subjects)]" onClick={()=>{setMention("all");setCohort("all");setOnlySelected(false);setSearch("");}}>Restablecer filtros</button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs"><span className="font-semibold text-[var(--color-fg-dim)]">Comparando:</span>{selectedSubjects.map(s=><button type="button" key={s.id} className="border border-[var(--color-subjects)]/40 px-2 py-1.5 text-[var(--color-subjects)]" onClick={()=>toggle(s.id)} title="Quitar de la comparación">{choose(s)} ×</button>)}<button className="border border-[var(--color-border-light)] px-2 py-1.5 text-[var(--color-fg-dim)]" onClick={()=>document.getElementById("selector-optativas")?.scrollIntoView({behavior:"smooth",block:"start"})}>Editar selección +</button></div>
    </section>

    <nav className="grid grid-cols-3 gap-2 xl:grid-cols-6" aria-label="Categorías de indicadores">{CATEGORIES.map(c=><button key={c.key} type="button" aria-pressed={category===c.key} onClick={()=>setCategory(c.key)} className={`border px-3 py-3 text-left transition-colors ${category===c.key?"border-[var(--color-subjects)] bg-[var(--color-subjects)]/10":"border-[var(--color-border-light)] bg-[var(--color-bg-card)] hover:border-[var(--color-subjects)]/60"}`}><span className="block font-mono text-[10px] text-[var(--color-subjects)]">{c.key} / {c.metrics.length} KPI</span><span className="mt-1 block font-heading text-sm">{c.short}</span></button>)}</nav>

    <section aria-live="polite"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-xs tracking-widest text-[var(--color-subjects)]">BLOQUE {category}</p><h2 className="font-display mt-2 text-2xl md:text-4xl">{current.name}</h2></div><label className="flex items-center gap-2 text-xs text-[var(--color-fg-dim)]"><input type="checkbox" checked={onlySelected} onChange={(e: ChangeEvent<HTMLInputElement>)=>setOnlySelected(e.target.checked)} className="accent-cyan-400"/>Solo materias comparadas</label></div>
      <div className="grid gap-4 lg:grid-cols-2">{current.metrics.map(m=><Panel key={m.id} metric={m}>{panelContent(m.id)}</Panel>)}</div>
    </section>

    <section id="selector-optativas" className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-heading text-xl">Seleccionar asignaturas</h2><p className="mt-1 text-xs text-[var(--color-fg-dim)]">Marca hasta cuatro optativas para compararlas en los gráficos.</p></div><span className="font-mono text-xs text-[var(--color-subjects)]">{selection.length}/4</span></div><input type="search" placeholder="Buscar optativa o código" value={search} onChange={(e: ChangeEvent<HTMLInputElement>)=>setSearch(e.target.value)} className="mt-4 w-full border border-[var(--color-border-light)] bg-[var(--color-bg-darker)] p-3 text-sm outline-none focus:border-[var(--color-subjects)]"/><SelectionList subjects={data.subjects.filter(s=>`${s.name} ${s.code}`.toLowerCase().includes(search.toLowerCase()))} selected={selection} toggle={toggle}/></div>
      <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5"><h2 className="font-heading text-xl">Ficha de asignatura</h2><p className="mt-1 text-xs text-[var(--color-fg-dim)]">Información del catálogo y extractos oficiales de la guía.</p><select value={focus?.id??""} onChange={(e: ChangeEvent<HTMLSelectElement>)=>setDetailId(e.target.value)} className="mt-4 w-full border border-[var(--color-border-light)] bg-[var(--color-bg-darker)] p-3 text-sm"><option value="">Primera de la selección</option>{data.subjects.map(s=><option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</select>{focus?<div className="mt-4 space-y-3"><p className="font-heading text-lg">{focus.name}</p><p className="text-xs text-[var(--color-fg-dim)]">{focus.code} · {fmt(focus.ects)} ECTS · {focus.year??"Curso no indicado"}.º curso · {focus.semester?`${focus.semester}.º semestre`:"Periodo no especificado"} · {focus.availability==="not_offered"?"No ofertada": "Incluida en el catálogo"}</p>{focus.guide?<><p className="font-semibold text-sm">Temario</p><Transcript text={focus.guide.program} sourceUrl={focus.guide.sourceUrl}/><p className="font-semibold text-sm">Evaluación</p><Transcript text={focus.guide.assessment} sourceUrl={focus.guide.sourceUrl}/></>:<Empty why="Guía no disponible. Comprueba la carga de dss_enrichment_716."/>}</div>:<Empty/>}</div>
    </section>

    <footer className="border-t border-[var(--color-border)] py-5 text-xs leading-relaxed text-[var(--color-fg-dim)]">Las calificaciones individuales, encuestas y evolución por mención son simuladas. Las guías y el catálogo están identificados por su procedencia. La versión actual permite investigar relaciones, no elegir automáticamente asignaturas. Guías cargadas: {guideCount}/40. <a className="text-[var(--color-subjects)] hover:underline" href={data.sourceUrl} target="_blank" rel="noopener noreferrer">Consultar plan oficial ↗</a></footer>
  </div>;
}
