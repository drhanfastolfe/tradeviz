# TradeViz

TradeViz es una aplicación web 100% frontend para visualizar CSVs de transacciones con un formato como:

```csv
datetime,date,account_type,category,type,asset_class,name,symbol,shares,price,amount,fee,tax,currency,original_amount,original_currency,fx_rate,description,transaction_id,counterparty_name,counterparty_iban,payment_reference,mcc_code
```

La app funciona de forma local en el navegador: el CSV se procesa con JavaScript en el dispositivo y no se sube a ningún servidor.

## Visualizaciones incluidas

- KPIs de aportaciones, retiradas, compras, ventas, dividendos, perks, comisiones e impuestos.
- Posiciones abiertas con coste FIFO estimado, último precio del CSV, valor actual estimado y P&L no realizado.
- P&L realizado por ventas usando consumo FIFO de lotes.
- Asignación por clase de activo.
- Concentración por posición.
- Evolución temporal de valor de mercado, coste abierto y P&L realizado.
- Actividad mensual.
- Tablas auditables de posiciones, ventas y transacciones.

> Nota: la valoración de posiciones usa el último precio encontrado en el CSV para cada símbolo. No consulta cotizaciones en tiempo real.

## Desarrollo local

```bash
npm install
npm run dev
```

## Build de producción

```bash
npm run build
```

El resultado estático se genera en `dist/`.

## Publicación en GitHub Pages

1. Sube este repositorio a GitHub.
2. En **Settings → Pages**, elige publicar desde GitHub Actions o desde una rama.
3. Si publicas manualmente, ejecuta `npm run build` y publica el contenido de `dist/`.
4. Abre la URL de GitHub Pages desde Chrome móvil y carga tu CSV desde el selector de archivos.

## Privacidad

TradeViz no incluye backend, cookies ni tracking. El archivo CSV permanece en el navegador que lo abre.
