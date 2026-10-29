import { P5D2_CONTRACT_VERSION, type P5D2Constraint, type P5D2ContractRecord, type P5D2Evidence, type P5D2Prerequisite, type P5D2PrerequisiteRelation } from './p5d2-contract.js';

const negator=/(?:must not|do not|don't|does not|never|cannot|can't|should not|不可|不可以|不能|不得|請勿|禁止|不要|先不要)/giu;
const action=/deploy|部署|delete|刪除|send|寄送|publish|發布|發佈|modify|change|修改|變更|run|執行/iu;
const actionMap:Record<string,string>={deploy:'deploy','部署':'deploy',delete:'delete','刪除':'delete',send:'send','寄送':'send',publish:'publish','發布':'publish','發佈':'publish',modify:'modify',change:'modify','修改':'modify','變更':'modify',run:'run','執行':'run'};
const scopeRules:Array<[string,RegExp]>=[['production',/production|\bprod(?:uction)?\b|正式環境|正式|上線/iu],['staging',/staging|test environment|測試環境/iu],['logs',/\blogs?\b|日誌(?:檔)?/iu],['email',/e-?mail|郵件/iu],['release',/release|版本/iu],['report',/\breport\b|報告/iu],['sandbox',/\bsandbox\b|沙盒/iu]];
const delimiters=/[,，;；。.!！？?\n]/u;
function span(input:string,start:number,end:number):P5D2Evidence{return{text:input.slice(start,end),start,end};}
function clauseEnd(input:string,start:number):number{let i=start;for(;i<input.length;i++){if(delimiters.test(input[i]!))return i;if(input.slice(i,i+3).toLowerCase()==='but'&&(i===0||!/[a-z]/i.test(input[i-1]!))&&(i+3===input.length||!/[a-z]/i.test(input[i+3]!)))return i;}return input.length;}
function scopeOf(text:string):string|null{for(const [value,re] of scopeRules)if(re.test(text))return value;return null;}
function predicateOf(text:string):string|null{
 if(/security\s+review/i.test(text))return'security review';
 if(/change\s+approval/i.test(text))return'change approval';
 if(/\bapprove|approval\b|核准|批准/i.test(text))return'user approval';
 if(/\bconfirm|confirmation\b|確認/i.test(text))return'user confirmation';
 if(/\bback(?:ed)?\s*up|\bbackup\b|備份/i.test(text))return'backup';
 return null;
}
function condition(input:string):{relation:P5D2PrerequisiteRelation;predicate:string;evidence:P5D2Evidence}|null{
 const unless=/\bunless\b\s*([^,，;；。.!！？?\n]+)|除非\s*([^,，;；。.!！？?\n]+)/iu.exec(input);
 if(unless){const raw=unless[0];const pred=predicateOf(raw);if(pred)return{relation:'prohibited_unless',predicate:pred,evidence:span(input,unless.index,unless.index+raw.length)};return null;}
 const until=/\b(until|before)\b\s*([^,，;；。.!！？?\n]+)/iu.exec(input);
 if(until){const raw=until[0];const pred=predicateOf(raw);if(pred)return{relation:'prohibited_until',predicate:pred,evidence:span(input,until.index,until.index+raw.length)};return null;}
 return null;
}
function hasConditionCue(input:string):boolean{return/\bunless\b|\buntil\b|\bbefore\b|\bafter\b|除非|否則|才能|之前|以後/iu.test(input);}

/** Research-only v2 constraint parser. It never creates Work Cards or executable actions. */
export function extractConstraintsV2(input:string):P5D2ContractRecord{
 const constraints:P5D2Constraint[]=[],unresolved:P5D2ContractRecord['unresolved']=[];
 const cond=condition(input);let match:RegExpExecArray|null;negator.lastIndex=0;
 while((match=negator.exec(input))!==null){
  const start=match.index,bodyStart=start+match[0].length,end=clauseEnd(input,bodyStart),tail=input.slice(bodyStart,end),verb=action.exec(tail);
  if(!verb){unresolved.push({evidence:span(input,start,end),reason:'Negation or restriction present, but no supported action was identified.'});continue;}
  const verbValue=actionMap[verb[0].toLowerCase()]??actionMap[verb[0]];
  if(!verbValue){unresolved.push({evidence:span(input,start,end),reason:'Unsupported constrained action.'});continue;}
  const afterVerb=tail.slice(verb.index+verb[0].length),scope=scopeOf(afterVerb)??'*';
  const prerequisiteCue=hasConditionCue(input);
  const prerequisite=prerequisiteCue?cond:null;
  if(prerequisiteCue&&!prerequisite){const cEnd=clauseEnd(input,0);unresolved.push({evidence:span(input,0,cEnd),reason:'Prerequisite or exception direction could not be represented with confidence.'});}
  constraints.push({action:verbValue,polarity:'prohibited',scope,evidence:span(input,start,end),prerequisite});
 }
 // A dependency cue without any grounded prohibition remains unresolved rather than becoming an action.
 if(hasConditionCue(input)&&constraints.length===0){const end=clauseEnd(input,0);if(!unresolved.some(x=>x.evidence.start===0))unresolved.push({evidence:span(input,0,end),reason:'Condition or exception has no supported constrained action.'});}
 return{contractVersion:P5D2_CONTRACT_VERSION,constraints,unresolved};
}

export function validateP5D2Evidence(input:string,item:P5D2Evidence):boolean{return Number.isInteger(item.start)&&Number.isInteger(item.end)&&item.start>=0&&item.end>=item.start&&item.end<=input.length&&input.slice(item.start,item.end)===item.text;}
export function evidenceSemanticallySupportsConstraint(input:string,c:P5D2Constraint):boolean{
 if(!validateP5D2Evidence(input,c.evidence))return false;
 const raw=c.evidence.text;
 const hasNeg=/must not|do not|don't|does not|never|cannot|can't|should not|不可|不可以|不能|不得|請勿|禁止|不要|先不要/iu.test(raw);
 const hasAction=action.test(raw)&&Object.hasOwn(actionMap,(raw.match(action)?.[0]??'').toLowerCase());
 const hasScope=c.scope==='*'||scopeOf(raw)===c.scope;
 if(!hasNeg||!hasAction||!hasScope)return false;
 if(c.prerequisite){return validateP5D2Evidence(input,c.prerequisite.evidence)&&predicateOf(c.prerequisite.evidence.text)===c.prerequisite.predicate&&((c.prerequisite.relation==='prohibited_unless'&&/unless|除非/iu.test(c.prerequisite.evidence.text))||(c.prerequisite.relation==='prohibited_until'&&/until|before/iu.test(c.prerequisite.evidence.text)));}
 return true;
}

export function evidenceSemanticallySupportsPrerequisite(input:string,p:P5D2Prerequisite):boolean{
 if(!validateP5D2Evidence(input,p.evidence))return false;
 const raw=p.evidence.text;
 const relation=p.relation==='prohibited_unless'?/unless|除非/iu.test(raw):/until|before|直到|之前/iu.test(raw);
 return relation&&predicateOf(raw)===p.predicate;
}
