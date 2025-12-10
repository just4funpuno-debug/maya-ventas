const express = require('express');
const app = express();
const PORT = 4000;
app.get('/', (req, res) => res.send('OK'));
app.listen(PORT, () => {
  console.log('Servidor de prueba corriendo en http://localhost:4000/');
});