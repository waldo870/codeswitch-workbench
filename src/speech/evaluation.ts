// P3C text alignment metrics; callers must supply actual ASR output and separate gold.
function distance(a:string[],b:string[]):number{let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=0;i<a.length;i++){const next=[i+1];for(let j=0;j<b.length;j++)next.push(Math.min(next[j]!+1,row[j+1]!+1,row[j]!+(a[i]===b[j]?0:1)));row=next;}return row[b.length]!;}
export function speechMetrics(reference:string,hypothesis:string,terms:string[]=[]){
 const uniqueTerms=[...new Set(terms.map(t=>t.trim().toLocaleLowerCase()).filter(Boolean))];
 const hasTerm=(term:string)=>{const escaped=term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');return new RegExp('(?:^|[^A-Za-z0-9_])'+escaped+'(?:$|[^A-Za-z0-9_])','iu').test(hypothesis);};
 const chars=[...reference],words=reference.trim().split(/\s+/).filter(Boolean),gotWords=hypothesis.trim().split(/\s+/).filter(Boolean);
 const metric=(n:number,d:number)=>({numerator:n,denominator:d,value:d?n/d:null});
 return {cer:metric(distance(chars,[...hypothesis]),chars.length),wer:metric(distance(words,gotWords),words.length),codeSwitchTermAccuracy:metric(uniqueTerms.filter(hasTerm).length,uniqueTerms.length)};
}
export interface SpeechEvaluationCase { id:string; audioSha256:string; referenceTranscript:string; codeSwitchTerms:string[]; expectedConstraintTuples:string[]; expectedCardCount:number }
export interface SpeechEvaluationOutcome { caseId:string; transcript:string|null; latencyMs:number; constraintFound:number; constraintTotal:number; endToEndCardSuccess:boolean; status:'RUN'|'NOT_RUN' }
