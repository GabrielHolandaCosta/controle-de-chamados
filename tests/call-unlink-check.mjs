const baseURL=process.env.CHAMADOS_BASE_URL||'http://localhost:3000';
const suffix=Date.now();
const ownerName=`vinculo.owner.${suffix}`;
const recipientName=`vinculo.recipient.${suffix}`;

async function session(username,password='123456'){
  const response=await fetch(`${baseURL}/api/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
  if(!response.ok)throw new Error(`Falha no login de ${username}`);
  return response.headers.get('set-cookie').split(';')[0];
}
async function api(path,{cookie,method='GET',body}={}){
  const response=await fetch(baseURL+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const data=response.status===204?{}:await response.json();
  if(!response.ok)throw new Error(data.error||`${method} ${path} falhou`);
  return data;
}

const adminCookie=await session('admin');
let ownerId,recipientId;
try{
  await api('/api/admin/users',{cookie:adminCookie,method:'POST',body:{username:ownerName,password:'123456',role:'user'}});
  await api('/api/admin/users',{cookie:adminCookie,method:'POST',body:{username:recipientName,password:'123456',role:'user'}});
  const users=(await api('/api/admin/users',{cookie:adminCookie})).users;
  ownerId=users.find(user=>user.username===ownerName).id;
  recipientId=users.find(user=>user.username===recipientName).id;
  const ownerCookie=await session(ownerName),recipientCookie=await session(recipientName);
  const callId=`unlink-${suffix}`;
  const records={'2026-11-23':[{_id:callId,service:'Teste de vínculo',requester:'Teste',department:'TI',opened:'SIM',start:'08:00',end:'08:30',os:'1'}]};
  await api('/api/calls',{cookie:ownerCookie,method:'PUT',body:{records,changedCallIds:[callId]}});

  await api('/api/call-links',{cookie:ownerCookie,method:'POST',body:{callId,targetUserId:recipientId}});
  if(!Object.values((await api('/api/calls',{cookie:recipientCookie})).records).flat().some(row=>row._id===callId))throw new Error('O destinatário não recebeu o chamado');
  const ownerUnlink=await api('/api/call-links',{cookie:ownerCookie,method:'DELETE',body:{callId,targetUserId:recipientId}});
  if(!ownerUnlink.removedCopy)throw new Error('O criador não removeu a cópia do destinatário');
  if(Object.values((await api('/api/calls',{cookie:recipientCookie})).records).flat().some(row=>row._id===callId))throw new Error('O chamado permaneceu com o destinatário após o criador desvincular');
  if(!Object.values((await api('/api/calls',{cookie:ownerCookie})).records).flat().some(row=>row._id===callId))throw new Error('O chamado sumiu da conta do criador');

  await api('/api/call-links',{cookie:ownerCookie,method:'POST',body:{callId,targetUserId:recipientId}});
  const recipientUnlink=await api('/api/call-links',{cookie:recipientCookie,method:'DELETE',body:{callId,targetUserId:ownerId}});
  if(!recipientUnlink.detachedSelf||recipientUnlink.removedCopy)throw new Error('O destinatário não encerrou apenas a sincronização');
  for(const cookie of [ownerCookie,recipientCookie])if(!Object.values((await api('/api/calls',{cookie})).records).flat().some(row=>row._id===callId))throw new Error('Uma cópia foi apagada quando o destinatário se desvinculou');
}finally{
  if(ownerId)await api(`/api/admin/users/${ownerId}`,{cookie:adminCookie,method:'DELETE'}).catch(()=>{});
  if(recipientId)await api(`/api/admin/users/${recipientId}`,{cookie:adminCookie,method:'DELETE'}).catch(()=>{});
}
