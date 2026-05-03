# SlabPro — Guía de Instalación y Arranque

## 📦 Paso 1: Instalar Node.js

Descarga e instala Node.js **v20 LTS** desde: https://nodejs.org

> Verifica la instalación abriendo PowerShell y ejecutando:
> ```
> node --version
> npm --version
> ```

---

## 🗄️ Paso 2: Verificar la Base de Datos

Si no lo has hecho, abre **phpMyAdmin** → `slabpro_bd` → Importa el archivo:

```
SlabPro/database/schema.sql
```

Esto creará las tablas: `clientes`, `presupuestos`, `presupuesto_lineas`.

---

## 🚀 Paso 3: Iniciar el servidor (Backend)

```powershell
cd C:\Users\Windows 11\OneDrive\Desktop\SlabPro\server
npm install
npm run dev
```

El servidor estará en: **http://localhost:3001**

Prueba que funciona: http://localhost:3001/api/health

---

## 🖥️ Paso 4: Iniciar el cliente (Frontend)

Abre **otra** ventana de PowerShell:

```powershell
cd C:\Users\Windows 11\OneDrive\Desktop\SlabPro\client
npm install
npm run dev
```

La aplicación estará en: **http://localhost:5173**

---

## 📁 Estructura del Proyecto

```
SlabPro/
├── server/                   ← Backend Node.js + Express
│   ├── index.js              ← Servidor principal
│   ├── db.js                 ← Conexión MySQL (mysql2)
│   ├── .env                  ← Variables de entorno (DB)
│   ├── package.json
│   └── routes/
│       ├── presupuestos.js   ← API CRUD de presupuestos
│       └── clientes.js       ← API de clientes
│
├── client/                   ← Frontend React + Vite
│   ├── src/
│   │   ├── App.jsx           ← Raíz + Sidebar
│   │   ├── main.jsx          ← Entrada React
│   │   ├── index.css         ← Sistema de diseño (dark theme)
│   │   ├── hooks/
│   │   │   └── useBudget.js  ← Estado, cálculo USD/Bs, persistencia
│   │   ├── components/
│   │   │   └── BudgetForm.jsx ← Formulario dinámico de presupuesto
│   │   ├── pages/
│   │   │   └── PresupuestosPage.jsx ← Lista + nuevo presupuesto
│   │   └── utils/
│   │       └── pdfGenerator.js ← Exportación PDF con jsPDF
│   └── vite.config.js        ← Proxy /api → :3001
│
└── database/
    └── schema.sql            ← Script SQL de creación de tablas
```

---

## 🔌 API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servidor |
| GET | `/api/presupuestos` | Listar todos los presupuestos |
| GET | `/api/presupuestos/:id` | Obtener presupuesto por ID |
| POST | `/api/presupuestos` | Crear nuevo presupuesto |
| PUT | `/api/presupuestos/:id` | Actualizar presupuesto completo |
| PATCH | `/api/presupuestos/:id/estatus` | Cambiar solo el estatus |
| DELETE | `/api/presupuestos/:id` | Eliminar presupuesto |
| GET | `/api/clientes?q=nombre` | Buscar/listar clientes |
| POST | `/api/clientes` | Crear cliente |

---

## ⚙️ Configuración

Edita `server/.env` para cambiar la conexión a la BD:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=slabpro_bd
DB_PORT=3306
PORT=3001
```

Edita `client/src/utils/pdfGenerator.js` para poner los datos reales de la empresa:

```js
const RIF_EMPRESA    = 'J-12345678-9';
const NOMBRE_EMPRESA = 'Marmolería SlabPro';
const TELEFONO_EMPRESA = '0412-0000000';
const EMAIL_EMPRESA    = 'info@slabpro.com';
```
