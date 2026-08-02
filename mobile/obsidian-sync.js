// Obsidian Sync — 手机↔GitHub↔Obsidian 双向同步（v2 适配）
// 依赖: mobile/index.html 中的 GH, ghToken(), SK, state, save(), renderAll(), toast()

async function syncObsidian(){
  var token=ghToken();if(!token)return;
  var s=document.getElementById('syncStatus');if(!s)return;
  s.textContent='读取Obsidian...';
  var paths=['每日日志/'+today()+'.md','执行系统/'+today()+'.md',today()+'.md'];
  var content='';
  for(var i=0;i<paths.length;i++){
    try{var r=await fetch('https://api.github.com/repos/'+GH.owner+'/'+GH.repo+'/contents/'+paths[i],{headers:{Authorization:'Bearer '+token}});if(r.ok){var d=await r.json();content=decodeURIComponent(escape(atob(d.content)));break}}catch(e){}
  }
  if(!content){s.textContent='今日暂无Obsidian计划';return}

  var tasks=[],revenueCards=[],currentCard=null;
  var lines=content.split('\n'),section='';
  for(var i=0;i<lines.length;i++){
    var line=lines[i].trim();
    if(line.startsWith('## ')){section=line.replace('## ','').replace(/^\d+\s*/,'');continue}
    if(line.startsWith('# ')){section=line.replace('# ','');continue}

    // Task lines
    var m=line.match(/^[-*] \[(.)\] (.+)$/);
    if(m){
      var text=m[2].replace(/#\S+/g,'').trim(),prio='p2';
      if(m[2].includes('#P0'))prio='p0';
      if(m[2].includes('#P1'))prio='p1';
      tasks.push({text:text,prio:prio,done:m[1]!==' ',added:today()});
    }

    // Revenue card detection: lines with stage markers
    if(line.includes('测试问题')||line.includes('已验证')||line.includes('已放大')||line.includes('已成交')){
      currentCard={id:'rc_obsidian_'+Date.now()+'_'+revenueCards.length,userProblem:line.replace(/^[-*]\s*/,''),stage:'testing',userQuotes:[],nextStep:'',contentStatus:'',matchedProduct:'',revenueLine:'meijie',actualIncome:0,feedback:'',updated:today()};
      if(line.includes('已成交'))currentCard.stage='closed';
      else if(line.includes('已放大'))currentCard.stage='amplified';
      else if(line.includes('已验证'))currentCard.stage='verified';
      revenueCards.push(currentCard);
    }

    // Learning items
    if(line.startsWith('- ')&&(section.includes('学习')||section.includes('学习卡'))){
      var lc=ns('learningCards',[]);
      if(!lc.find(function(x){return x.title===line.replace('- ','')})){
        lc.push({id:'lc_obsidian_'+Date.now(),title:line.replace('- ',''),source:'Obsidian导入',core:'',problem:'',application:'',date:today(),status:'待应用'});
      }
    }
  }

  if(tasks.length){state.tasks=state.tasks?state.tasks.concat(tasks.filter(function(t){return !state.tasks.find(function(x){return x.text===t.text})})):tasks}
  if(revenueCards.length){var existing=ns('revenueCards',[]);state.revenueCards=existing.concat(revenueCards)}
  save();renderAll();s.textContent='已同步'+(tasks.length)+'项任务+'+revenueCards.length+'主题';
  if(tasks.length||revenueCards.length)toast('Obsidian已加载');
}

async function saveBackToObsidian(){
  var token=ghToken();if(!token)return;
  var s=document.getElementById('syncStatus');if(!s)s={textContent:''};
  s.textContent='同步回Obsidian...';

  var md='# '+today()+'\n\n';

  // Tasks
  var tasks=state.tasks||[];
  md+='## 行动\n\n';
  tasks.forEach(function(t){
    var tags=[];if(t.prio==='p0')tags.push('#P0');if(t.prio==='p1')tags.push('#P1');
    md+='- ['+(t.done?'x':' ')+'] '+t.text+' '+tags.join(' ')+'\n';
  });

  // Revenue cards
  var rc=state.revenueCards||[];
  if(rc.length){
    md+='\n## 赚钱飞轮\n\n';
    var stageLabels={testing:'🧪测试',verified:'✅验证',amplified:'📡放大',matched:'🎯匹配',closed:'💰成交',delivered:'📦交付'};
    rc.forEach(function(r){md+='- ['+stageLabels[r.stage]+'] '+(r.userProblem||r.sourceCard)+' → '+(r.nextStep||'')+' · ¥'+(r.actualIncome||0)+' ('+(r.revenueLine==='meijie'?'梅姐':'驿马')+')\n'});
  }

  // Customers
  var cr=state.customerRecords||[];
  if(cr.length){
    md+='\n## 客户\n\n';
    cr.forEach(function(c){md+='- '+c.name+' | '+c.stage+' | '+(c.realProblem||'')+' | '+(c.nextAction||'')+'\n'});
  }

  // Evening handoff
  var ho=state.eveningHandoff||{};
  md+='\n## 晚间复盘\n- 心态：'+(ho.mindset||'—')+'\n- 学习：'+(ho.learning||'—')+'\n- 目标：'+(ho.goals||'—')+'\n- 行动：'+(ho.action||'—')+'\n- 时间：'+(ho.time||'—')+'\n- 客户：'+(ho.customers||'—')+'\n';
  md+='\n## 明日计划交接\n';
  if(ho.tomorrowGoals)ho.tomorrowGoals.forEach(function(g){md+='- ['+g.prio+'] '+g.text+' ← '+g.from+'\n'});

  var path='每日日志/'+today()+'.md';
  try{
    var sha='';try{var r=await fetch('https://api.github.com/repos/'+GH.owner+'/'+GH.repo+'/contents/'+path,{headers:{Authorization:'Bearer '+token}});if(r.ok){var d=await r.json();sha=d.sha}}catch(e){}
    var body={message:'phone sync '+today(),content:btoa(unescape(encodeURIComponent(md)))};if(sha)body.sha=sha;
    r=await fetch('https://api.github.com/repos/'+GH.owner+'/'+GH.repo+'/contents/'+path,{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(r.ok){s.textContent='已同步到Obsidian';toast('打勾已同步！')}else{var e=await r.json();s.textContent=e.message}
  }catch(e){s.textContent='网络错误'}
}
