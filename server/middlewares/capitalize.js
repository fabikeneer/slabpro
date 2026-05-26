function capitalizeText(str) {
  if (typeof str !== 'string' || !str.trim()) return str;
  
  // Evitar modificar strings que parecen JSON
  if (str.trim().startsWith('{') || str.trim().startsWith('[')) {
    try {
      JSON.parse(str);
      return str;
    } catch (e) {
      // Ignorar, es texto normal
    }
  }

  // Capitalizar la primera letra de cada palabra y mantener el resto igual
  return str.split(' ').map(word => {
    if (!word) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

const fieldsToCapitalize = [
  'nombre', 
  'apellido', 
  'nombre_cliente', 
  'nombre_proyecto', 
  'cliente_nombre', 
  'beneficiario', 
  'proveedor', 
  'responsable',
  'concepto', 
  'descripcion', 
  'descripcion_obra', 
  'proyecto_descripcion',
  'observaciones',
  'direccion',
  'cargo'
];

function recursiveCapitalize(obj) {
  if (Array.isArray(obj)) {
    obj.forEach(item => recursiveCapitalize(item));
  } else if (obj !== null && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (fieldsToCapitalize.includes(key) && typeof obj[key] === 'string') {
        obj[key] = capitalizeText(obj[key]);
      } else if (typeof obj[key] === 'object') {
        recursiveCapitalize(obj[key]);
      }
    }
  }
}

function capitalizeMiddleware(req, res, next) {
  if (req.body) {
    recursiveCapitalize(req.body);
  }
  next();
}

module.exports = capitalizeMiddleware;
