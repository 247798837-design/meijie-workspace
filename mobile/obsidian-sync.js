// Obsidian Sync — 手机↔GitHub↔Obsidian 双向同步
async function syncObsidian(){
  var token=ghToken();if(!token)return;
  var s=document.getElementById('syncStatus');s.textContent='读取Obsidian...';
  var paths=['每日日志/'+today()+'.md','执行系统/'+today()+'.md',today()+'.md'];
  var content='';
  for(var i=0;i<paths.length;i++){
    try{var r=await fetch('https://api.github.com/repos/'+GH.owner+'/'+GH.repo+'/contents/'+paths[i],{headers:{Authorization:'Bearer '+token}});if(r.ok){var d=await r.json();content=decodeURIComponent(escape(atob(d.content)));break}}catch(e){}
  }
  if(!content){s.textContent='今日暂无Obsidian计划';return}
  var tasks=[],familyTasks=[],learnItems=[];
  var lines=content.split('\n');var section='';
  for(var i=0;i<lines.length;i++){
    var line=lines[i].trim();
    if(line.startsWith('## ')){section=line.replace('## ','');continue}
    if(line.startsWith('# ')){section=line.replace('# ','');continue}
    var m=line.match(/^[-*] \[(.)\] (.+)$/);
    if(m){
      var item={text:m[2].replace(/#\S+/g,'').trim(),done:m[1]!==' ',prio:'p2',family:false};
      if(m[2].includes('#P0'))item.prio='p0';
      if(m[2].includes('#P1'))item.prio='p1';
      if(m[2].includes('#家庭')||section.includes('家庭')){item.family=true;familyTasks.push(item)}
      if(section.includes('目标')){}else{tasks.push(item)}
    }
    if(line.startsWith('- ')&&section.includes('学习'))learnItems.push(line.replace('- ',''));
  }
  if(tasks.length||familyTasks.length){state.tasks=tasks.concat(familyTasks);state._obsidianSync=today()}
  if(learnItems.length){var lc=ns('learningCard',{});lc.what=learnItems[0]}
  save();renderAll();s.textContent='已同步'+(tasks.length+familyTasks.length)+'项';toast('Obsidian已加载')
}

async function saveBackToObsidian(){
  var token=ghToken();if(!token)return;
  var s=document.getElementById('syncStatus');s.textContent='同步回Obsidian...';
  var md='# '+today()+'\n\n## 行动\n\n';
  var tasks=ns('tasks',[]);
  tasks.forEach(function(t){
    var tags=[];if(t.prio==='p0')tags.push('#P0');if(t.prio==='p1')tags.push('#P1');if(t.family)tags.push('#家庭');
    md+='- ['+(t.done?'x':' ')+'] '+t.text+' '+tags.join(' ')+'\n';
  });
  var fw=ns('flywheel',{});var ms=ns('mindset',{});
  md+='\n## 飞轮\n- 写：'+(fw.write||'—')+'\n- 拍：'+(fw.shoot||'—')+'\n- 发：'+(fw.publish||'—')+'\n';
  md+='- 连接：'+(fw.connect||0)+'人\n- 需求：'+(fw.need||0)+'人\n- 到账：¥'+(fw.income||0)+'\n- 复盘：'+(fw.review||'—')+'\n';
  md+='\n## 心态\n- 能量：'+(ms.energyScore||'—')+'分\n- 晨/晚：'+(ms.morningMood||'—')+'/'+(ms.nightMood||'—')+'\n';
  md+='- 肯定语：'+(ms.affirmation||'—')+'\n- 阻力：'+((ms.resistances||[]).join('、')||'无')+'\n';
  var lc=ns('learningCard',{});if(lc.what)md+='\n## 学习\n- '+lc.what+' | '+lc.source+'\n- 心得：'+lc.insight+'\n- 应用：'+lc.apply+'\n';
  var path='每日日志/'+today()+'.md';
  try{
    var sha='';try{var r=await fetch('https://api.github.com/repos/'+GH.owner+'/'+GH.repo+'/contents/'+path,{headers:{Authorization:'Bearer '+token}});if(r.ok){var d=await r.json();sha=d.sha}}catch(e){}
    var body={message:'phone sync '+today(),content:btoa(unescape(encodeURIComponent(md)))};if(sha)body.sha=sha;
    r=await fetch('https://api.github.com/repos/'+GH.owner+'/'+GH.repo+'/contents/'+path,{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(r.ok){s.textContent='已同步到Obsidian';toast('打勾已同步！')}else{var e=await r.json();s.textContent=e.message}
  }catch(e){s.textContent='网络错误'}
}
