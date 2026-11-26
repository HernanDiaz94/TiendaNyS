import { useMemo } from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { formatShortDate } from '../lib/inventory.js';
import { buildProfitReport } from '../lib/profit.js';
import { formatPrice, shortReference } from '../lib/shop.js';
import { Spinner } from '../components/ui.jsx';

function percent(value) {
  return value === null || value === undefined || !Number.isFinite(Number(value))
    ? '—'
    : `${Number(value).toFixed(1)}%`;
}

function costLabel(value) {
  return value === null || value === undefined ? 'sin costo' : formatPrice(value);
}

function Metric({ label, value, detail, alert }) {
  return (
    <article className={`profit-metric ${alert ? 'profit-metric--alert' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

export function ProfitReport({ orders, products, purchases, loading }) {
  const report = useMemo(
    () => buildProfitReport({ orders, products, purchases }),
    [orders, products, purchases],
  );

  if (loading) {
    return (
      <section className="admin-section" role="tabpanel">
        <div className="admin-loading"><Spinner label="Calculando rentabilidad" /> Calculando rentabilidad…</div>
      </section>
    );
  }

  const { totals, stock } = report;

  return (
    <section className="admin-section" role="tabpanel">
      <div className="admin-section-head">
        <div>
          <h2>Rentabilidad</h2>
          <p>
            Utilidad exacta por unidad vendida: cada venta consume sus lotes en orden FIFO
            y guarda el costo real al momento del pedido.
          </p>
        </div>
      </div>

      {totals.unknownUnits > 0 && (
        <div className="inventory-alert">
          <AlertTriangle size={17} aria-hidden="true" />
          <p>
            <strong>{totals.unknownUnits} unidades sin costo.</strong> Son stock de apertura
            (anterior al control de lotes) o ventas sin historial. Se excluyen de la ganancia
            en lugar de contar una utilidad inventada. Registrá compras nuevas para que las
            siguientes ventas tengan costo exacto.
          </p>
        </div>
      )}

      <div className="profit-metrics">
        <Metric label="Ventas registradas" value={formatPrice(totals.revenue)} detail="Pedidos no cancelados" />
        <Metric label="Costo conocido" value={formatPrice(totals.knownCost)} detail={`${totals.knownUnits} unidades con costo`} />
        <Metric label="Ganancia conocida" value={formatPrice(totals.knownProfit)} detail={`Mark-up ${percent(totals.markup)} · Margen ${percent(totals.margin)}`} />
        <Metric
          label="Unidades sin costo"
          value={String(totals.unknownUnits)}
          detail="Stock de apertura o sin lote"
          alert={totals.unknownUnits > 0}
        />
      </div>

      <h3 className="profit-subtitle">Por artículo</h3>
      {report.byProduct.length === 0 ? (
        <div className="admin-empty">
          <TrendingUp size={26} aria-hidden="true" />
          <h3>Todavía no hay ventas para analizar.</h3>
          <p>Cuando se registre un pedido vas a ver acá la ganancia por producto.</p>
        </div>
      ) : (
        <div className="profit-table-wrap">
          <table className="profit-table">
            <thead>
              <tr>
                <th>Artículo</th>
                <th>U.</th>
                <th>Ventas</th>
                <th>Costo</th>
                <th>Ganancia</th>
                <th>% costo</th>
                <th>% venta</th>
                <th>Sin costo</th>
              </tr>
            </thead>
            <tbody>
              {report.byProduct.map((row) => (
                <tr key={row.productName}>
                  <td>{row.productName}</td>
                  <td>{row.units}</td>
                  <td>{formatPrice(row.revenue)}</td>
                  <td>{formatPrice(row.cost)}</td>
                  <td className="profit-positive">{formatPrice(row.profit)}</td>
                  <td>{percent(row.markup)}</td>
                  <td>{percent(row.margin)}</td>
                  <td>{row.unknownUnits || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="profit-subtitle">Detalle de ventas</h3>
      {report.sales.length === 0 ? (
        <p className="profit-note">No hay ventas registradas todavía.</p>
      ) : (
        <div className="profit-table-wrap">
          <table className="profit-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Fecha</th>
                <th>Artículo</th>
                <th>Talle</th>
                <th>U.</th>
                <th>Precio u.</th>
                <th>Costo u.</th>
                <th>Ganancia</th>
              </tr>
            </thead>
            <tbody>
              {report.sales.map((sale) => (
                <tr key={`${sale.orderId}-${sale.productName}-${sale.size}`}>
                  <td>#{shortReference(sale.orderId)}</td>
                  <td>{formatShortDate(sale.createdAt)}</td>
                  <td>
                    {sale.productName}
                    {sale.unknownQuantity > 0 && (
                      <span className="profit-tag">sin costo ×{sale.unknownQuantity}</span>
                    )}
                  </td>
                  <td>{sale.size}</td>
                  <td>{sale.quantity}</td>
                  <td>{formatPrice(sale.unitPrice)}</td>
                  <td>{costLabel(sale.unitCost)}</td>
                  <td className={sale.knownProfit > 0 ? 'profit-positive' : ''}>
                    {sale.knownProfit > 0 ? formatPrice(sale.knownProfit) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="profit-subtitle">Stock valuado a precio actual</h3>
      <div className="profit-stock">
        <span>
          Costo del stock con precio conocido: <strong>{formatPrice(stock.cost)}</strong>
        </span>
        <span>
          Ganancia potencial: <strong>{formatPrice(stock.profit)}</strong> ({percent(stock.margin)})
        </span>
        <span>
          Unidades sin costo: <strong>{stock.withoutCost}</strong>
        </span>
      </div>
      <p className="profit-note">
        El % sobre costo es el mark-up (2500 / 10000 = 25%). El % sobre venta es el margen
        comercial (2500 / 12500 = 20%). El costo unitario queda fijado al crear el pedido:
        cancelar el pedido devuelve las unidades a su lote original.
      </p>
    </section>
  );
}
