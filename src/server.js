const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = Number(process.env.PORT || 3000);
const dataFilePath = path.join(__dirname, '..', 'storage', 'app', 'coupons_simulation.json');

const defaultDetail = [
  {
    numPlu: '110',
    Cod_Plu: '110',
    descripcion_plu: 'AGUA',
    cantidad: '1',
    iva: '21',
    precioBruto: '3390',
    precioNeto: '2800'
  },
  {
    numPlu: '3002',
    Cod_Plu: '3002',
    descripcion_plu: 'TOSTADO LYQ LLV',
    cantidad: '1',
    iva: '21',
    precioBruto: '3390',
    precioNeto: '2800'
  }
];

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;

  if (requestOrigin) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Vary', 'Origin');
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.options('*', (req, res) => {
  const requestOrigin = req.headers.origin;

  if (requestOrigin) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Vary', 'Origin');
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  return res.sendStatus(204);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

function ensureStorageFile() {
  const dir = path.dirname(dataFilePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify({ coupons: {}, history: [] }, null, 2));
  }
}

function readSimulationData() {
  ensureStorageFile();

  try {
    const raw = fs.readFileSync(dataFilePath, 'utf8');
    const parsed = JSON.parse(raw || '{}');

    return {
      coupons: parsed.coupons || {},
      history: parsed.history || []
    };
  } catch (error) {
    return { coupons: {}, history: [] };
  }
}

function writeSimulationData(data) {
  const dir = path.dirname(dataFilePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

function getStatusDescription(status) {
  const statusMap = {
    1: 'Activo',
    2: 'Procesando',
    3: 'Canjeado'
  };

  return statusMap[status] || 'Desconocido';
}

function getCouponId(body = {}) {
  return (
    body.coupon ||
    body.cupon ||
    body.cuponkfc ||
    body.codigoCupon ||
    body.id ||
    body.idCupon ||
    body.codigo ||
    null
  );
}

function getStatusValue(body = {}) {
  const rawStatus = body.status ?? body.estado ?? body.couponStatus;
  const status = Number(rawStatus);

  return Number.isNaN(status) ? null : status;
}

function toPrintableDetail(detail) {
  return detail.map((item) => ({
    numPlu: item.numPlu,
    Cod_Plu: item.Cod_Plu,
    descripcion_plu: item.descripcion_plu || item.Descripcion,
    cantidad: item.cantidad || item.Cantidad,
    iva: item.iva || item.IVA,
    precioBruto: item.precioBruto || item.Bruto,
    precioNeto: item.precioNeto || item.Neto
  }));
}

function buildProcessResponse(couponId, requestData, status) {
  const detail = defaultDetail.map((item) => ({
    ...item,
    cuponkfc: couponId
  }));

  return {
    response: true,
    estado: status,
    retorno: 1,
    cupon: couponId,
    respuesta: status === 3 ? 'Cupon Canjeado Exitosamente\r\n' : `Cupon ${getStatusDescription(status)}\r\n`,
    precioBruto: 3390,
    precioNeto: 2800,
    iva: 590,
    tipoCupon: 'Cortesia Mercadeo',
    codTipoCupon: 4,
    detalle: toPrintableDetail(detail),
    data: {
      header: {
        type: 4,
        folio: requestData.folio || '306018',
        idFactura: requestData.idFactura || 'K007F000201331',
        fecha: new Date().toISOString(),
        monto: 3390,
        orden: {
          IDCabeceraOrdenPedido: requestData.IDCabeceraOrdenPedido || requestData.idCabeceraOrdenPedido || 'ODP123',
          cfac_id: requestData.cfac_id || 'CFAC123'
        },
        cuponkfc: couponId
      },
      detail: detail.map((item) => ({
        numPlu: item.numPlu,
        Cod_Plu: item.Cod_Plu,
        Descripcion: item.descripcion_plu,
        Cantidad: item.cantidad,
        IVA: item.iva,
        Bruto: item.precioBruto,
        Neto: item.precioNeto,
        plu_impresion: item.descripcion_plu,
        cuponkfc: couponId
      }))
    }
  };
}

function buildStatusResponse(updateInfo) {
  return {
    response: true,
    retorno: 1,
    cupon: updateInfo.coupon,
    estado: updateInfo.status,
    descripcion: updateInfo.description,
    respuesta: `Status actualizado a ${updateInfo.description} (Simulado)`,
    updated_at: updateInfo.updated_at,
    request_data: updateInfo.request_data
  };
}

function buildUpdateInfo(couponId, status, requestData, action) {
  return {
    coupon: couponId,
    status,
    description: getStatusDescription(status),
    updated_at: new Date().toISOString(),
    action,
    request_data: requestData
  };
}

function saveCouponUpdate(updateInfo) {
  const currentData = readSimulationData();

  console.log('Guardando actualizacion de cupon:', updateInfo);

  currentData.coupons[updateInfo.coupon] = updateInfo;
  currentData.history.unshift(updateInfo);

  writeSimulationData(currentData);

  console.log('Actualizacion persistida en JSON:', dataFilePath);

  return updateInfo;
}

app.post('/coupons/process', (req, res) => {
  try {
    console.log('Entrando a /coupons/process');
    const couponId = getCouponId(req.body);

    if (!couponId) {
      return res.status(400).json({
        response: false,
        retorno: 0,
        respuesta: 'El campo coupon/cupon es obligatorio',
        error: 'El campo coupon/cupon es obligatorio'
      });
    }

    const requestedStatus = getStatusValue(req.body) || 3;
    const updateInfo = buildUpdateInfo(couponId, requestedStatus, req.body, 'process');
    saveCouponUpdate(updateInfo);

    console.log('Respondiendo /coupons/process para cupon:', couponId);

    return res.json(buildProcessResponse(couponId, req.body, requestedStatus));
  } catch (error) {
    console.error('Error en /coupons/process:', error);
    return res.status(500).json({
      response: false,
      retorno: 0,
      respuesta: `Error en Simulacion: ${error.message}`,
      error: `Error en Simulacion: ${error.message}`
    });
  }
});

app.post('/coupons/changeStatus', (req, res) => {
  try {
    console.log('Entrando a /coupons/changeStatus');
    const couponId = getCouponId(req.body);
    const status = getStatusValue(req.body);

    if (!couponId) {
      return res.status(400).json({
        response: false,
        retorno: 0,
        respuesta: 'El campo coupon/cupon es obligatorio',
        error: 'El campo coupon/cupon es obligatorio'
      });
    }

    if (status === null) {
      return res.status(400).json({
        response: false,
        retorno: 0,
        respuesta: 'El campo status/estado debe ser numerico',
        error: 'El campo status/estado debe ser numerico'
      });
    }

    const updateInfo = buildUpdateInfo(couponId, status, req.body, 'changeStatus');
    saveCouponUpdate(updateInfo);

    console.log('Respondiendo /coupons/changeStatus para cupon:', couponId, 'estado:', status);

    return res.json(buildStatusResponse(updateInfo));
  } catch (error) {
    console.error('Error en /coupons/changeStatus:', error);
    return res.status(500).json({
      response: false,
      retorno: 0,
      respuesta: `Error en Simulacion: ${error.message}`,
      error: `Error en Simulacion: ${error.message}`
    });
  }
});

app.post('/coupons/getStatusCoupon', (req, res) => {
  try {
    console.log('Entrando a /coupons/getStatusCoupon');
    const couponId = getCouponId(req.body);

    if (!couponId) {
      return res.status(400).json({
        response: false,
        retorno: 0,
        respuesta: 'El campo coupon/cupon es obligatorio',
        error: 'El campo coupon/cupon es obligatorio'
      });
    }

    const currentData = readSimulationData();
    const couponData = currentData.coupons[couponId];

    console.log('Estado encontrado para cupon:', couponId, couponData || null);

    if (!couponData) {
      return res.status(404).json({
        response: false,
        retorno: 0,
        cupon: couponId,
        respuesta: 'Cupon no encontrado en la simulacion',
        error: 'Cupon no encontrado en la simulacion'
      });
    }

    return res.json({
      response: true,
      retorno: 1,
      cupon: couponId,
      estado: couponData.status,
      descripcion: couponData.description,
      respuesta: 'Estado actual del cupon obtenido correctamente',
      data: couponData
    });
  } catch (error) {
    console.error('Error en /coupons/getStatusCoupon:', error);
    return res.status(500).json({
      response: false,
      retorno: 0,
      respuesta: `Error en Simulacion: ${error.message}`,
      error: `Error en Simulacion: ${error.message}`
    });
  }
});

app.get('/coupons/simulationData', (req, res) => {
  try {
    console.log('Entrando a /coupons/simulationData');
    console.log('Query params:', req.query);
    const data = readSimulationData();
    console.log('Devolviendo simulationData con cupones:', Object.keys(data.coupons).length);
    return res.json(data);
  } catch (error) {
    console.error('Error en /coupons/simulationData:', error);
    return res.status(500).json({
      successful: false,
      error: `Error en Simulacion: ${error.message}`,
      respuesta: `Error en Simulacion: ${error.message}`
    });
  }
});

app.get('/health', (_req, res) => {
  res.json({ successful: true, message: 'API de simulacion operativa' });
});

ensureStorageFile();

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});