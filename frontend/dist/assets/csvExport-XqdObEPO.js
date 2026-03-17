function a(r,t){if(!t.length)return;const o=Object.keys(t[0]),s=[o.join(","),...t.map(d=>o.map(u=>{const c=d[u],n=c==null?"":String(c);return n.includes(",")||n.includes('"')||n.includes(`
`)?`"${n.replace(/"/g,'""')}"`:n}).join(","))].join(`
`),i=new Blob(["\uFEFF"+s],{type:"text/csv;charset=utf-8;"}),l=URL.createObjectURL(i),e=document.createElement("a");e.href=l,e.download=`${r}_${new Date().toISOString().slice(0,10)}.csv`,document.body.appendChild(e),e.click(),document.body.removeChild(e),URL.revokeObjectURL(l)}export{a as e};
