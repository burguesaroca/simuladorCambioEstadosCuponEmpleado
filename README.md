# Servicio Cupon Simulacion

API pequena en Express para emular el flujo de cupones y guardar cambios de estado en un archivo JSON.

## Endpoints

- `POST /coupons/process`
- `POST /coupons/changeStatus`
- `POST /coupons/getStatusCoupon`
- `GET /coupons/simulationData`
- `GET /health`

## Ejecutar

```bash
npm install
npm run dev
```

## Ejemplos

```bash
curl -X POST http://localhost:3000/coupons/changeStatus \
  -H "Content-Type: application/json" \
  -d '{"coupon":"ABC123","status":1}'
```

```bash
curl -X POST http://localhost:3000/coupons/getStatusCoupon \
  -H "Content-Type: application/json" \
  -d '{"coupon":"ABC123"}'
```

```bash
curl http://localhost:3000/coupons/simulationData
```

Los datos se guardan en `storage/app/coupons_simulation.json`.
