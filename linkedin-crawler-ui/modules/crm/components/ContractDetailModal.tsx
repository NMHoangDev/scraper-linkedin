'use client';

import { CalendarDays, FileText, Wallet, X } from './icons';
import {
  formatDate,
  formatDateTime,
  formatVND,
  getContractLabel,
  getContractStatusText,
  getContractUrl,
  getPaymentStatusText,
  getServicePackageText,
} from '../constants/crmConfig';
import type { Deal } from '../types';

type Props = {
  deal: Deal | null;
  open: boolean;
  onClose: () => void;
};

function pdfSafe(value?: string | number | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function buildSimplePdf(lines: string[]) {
  const content = [
    'BT',
    '/F1 15 Tf',
    '50 790 Td',
    ...lines.flatMap((line, index) => [
      index === 0 ? `(${pdfSafe(line)}) Tj` : `0 -22 Td (${pdfSafe(line)}) Tj`,
    ]),
    'ET',
  ].join('\n');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach(object => {
    offsets.push(pdf.length);
    pdf += object;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

function downloadContractPdf(deal: Deal) {
  const label = getContractLabel(deal) || deal.dealId;
  const rows = contractRows(deal);
  const pdf = buildSimplePdf([
    'CHI TIET HOP DONG / BAO GIA',
    `Ma: ${label}`,
    `Khach hang: ${deal.customerName}`,
    `Cong ty: ${deal.companyName || 'Chua cap nhat'}`,
    ...rows.map(row => `${row.label}: ${row.value || 'Chua cap nhat'}`),
  ]);
  const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${label.replace(/[\\/:*?"<>|]/g, '-') || 'hop-dong'}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function contractRows(deal: Deal) {
  return [
    { label: 'Mã HĐ/BG', value: getContractLabel(deal), icon: FileText },
    { label: 'Tên hợp đồng', value: deal.contract.title, icon: FileText },
    { label: 'Tình trạng hợp đồng', value: getContractStatusText(deal.contract.status), icon: FileText },
    { label: 'Trạng thái thanh toán', value: getPaymentStatusText(deal.contract.paymentStatus), icon: Wallet },
    { label: 'Giá trị hợp đồng', value: formatVND(deal.estimatedBudget || deal.lifetimeValue || deal.quote?.totalAmount || 0), icon: Wallet },
    { label: 'Danh mục sản phẩm', value: getServicePackageText(deal.servicePackage), icon: FileText },
    { label: 'Số báo giá', value: deal.quote?.number || deal.quote?.id, icon: FileText },
    { label: 'Giá trị báo giá', value: formatVND(deal.quote?.totalAmount || 0), icon: Wallet },
    { label: 'Ngày ký', value: formatDate(deal.contract.signedAt), icon: CalendarDays },
    { label: 'Ngày cần thanh toán', value: formatDate(deal.contract.paymentDueDate), icon: CalendarDays },
    { label: 'Ngày đóng', value: formatDate(deal.closedAt), icon: CalendarDays },
    { label: 'Bảo hành đến', value: formatDate(deal.contract.warrantyExpiresAt), icon: CalendarDays },
    { label: 'Ngày thành khách hàng', value: formatDate(deal.contract.customerSince), icon: CalendarDays },
    { label: 'Lần chăm sóc gần nhất', value: formatDateTime(deal.contract.lastCareAt), icon: CalendarDays },
  ];
}

export function ContractDetailModal({ deal, open, onClose }: Props) {
  if (!open || !deal) return null;
  const label = getContractLabel(deal);
  const url = getContractUrl(deal);

  return (
    <div className="crm-modal-backdrop crm-contract-detail-backdrop" onClick={onClose}>
      <section className="crm-contract-detail-modal" onClick={event => event.stopPropagation()}>
        <header className="crm-contract-detail-header">
          <div>
            <span>Chi tiết hợp đồng / báo giá</span>
            <h2>{label || 'Chưa có mã HĐ/BG'}</h2>
            <p>{deal.position ? `${deal.customerName} - ${deal.position}` : deal.customerName}</p>
          </div>
          <button type="button" className="crm-modal-close" onClick={onClose} aria-label="Đóng">
            <X className="crm-icon" />
          </button>
        </header>

        <div className="crm-contract-detail-body">
          <div className="crm-contract-detail-summary">
            <strong>{deal.companyName || 'Chưa có công ty'}</strong>
            <span>{deal.contract.note || deal.note || 'Chưa có ghi chú hợp đồng.'}</span>
          </div>

          <div className="crm-contract-detail-grid">
            {contractRows(deal).map(row => {
              const Icon = row.icon;
              return (
                <article key={row.label} className="crm-contract-detail-card">
                  <span><Icon className="crm-line-icon" /> {row.label}</span>
                  <b>{row.value || 'Chưa cập nhật'}</b>
                </article>
              );
            })}
          </div>

          {url ? (
            <a className="crm-contract-source-link" href={url} target="_blank" rel="noopener noreferrer">
              <FileText className="crm-line-icon" />
              Mở link hợp đồng / báo giá gốc
            </a>
          ) : null}
        </div>

        <footer className="crm-contract-detail-footer">
          <button type="button" className="crm-secondary-button" onClick={onClose}>Đóng</button>
          <button type="button" className="crm-primary-button" onClick={() => downloadContractPdf(deal)}>
            <FileText className="crm-button-icon" />
            Tải PDF
          </button>
        </footer>
      </section>
    </div>
  );
}
