const fs=require('fs');
const txt=fs.readFileSync('E:/MAYA LIFE AND BEAUTY/INVENTARIO VENTAS/maya-ventas-mvp-vite-no-backticks/src/App.jsx','utf8');
let o=0,c=0;for(const ch of txt){if(ch=='{')o++;else if(ch=='}')c++;}
console.log('opens',o,'closes',c,'diff',o-c);
