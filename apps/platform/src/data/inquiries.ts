import { FUNCTION_NAMES } from '@basis/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { callFunction } from '../lib/functions';
import { isSample } from './source';

// What the website sent in. Sample mode shows two invented inquiries.

export interface InquiryView {
  readonly id: string;
  readonly reference: string;
  readonly kind: 'sample_request' | 'wholesale' | 'contact' | string;
  readonly name: string;
  readonly company: string;
  readonly email: string;
  readonly phone: string;
  readonly country: string;
  readonly customerType: string;
  readonly topic: string;
  readonly message: string;
  readonly products: readonly string[];
  readonly shades: readonly string[];
  readonly volume: string;
  readonly address: string;
  readonly page: string;
  readonly state: string;
  readonly createdAt: string;
}

export const INQUIRY_KIND_LABEL: Record<string, string> = { sample_request: 'Sample request', wholesale: 'Wholesale application', contact: 'Message' };

const sampleInquiries: InquiryView[] = [
  { id: 'inq-1', reference: 'INQ-26-0007', kind: 'sample_request', name: 'Noa Levi', company: 'Atelier Levi', email: 'noa@atelier-levi.example', phone: '', country: 'Israel', customerType: 'Atelier', topic: '', message: 'Comparing against a European powermesh for a corseted bodice.', products: ['PWM', 'ILM'], shades: ['SK02', 'MLK'], volume: '', address: 'Dizengoff 100, Tel Aviv', page: '/fabrics/mesh/powermesh', state: 'new', createdAt: '2026-10-05T14:20:00Z' },
  { id: 'inq-2', reference: 'INQ-26-0006', kind: 'wholesale', name: 'Marta Ruiz', company: 'Novia Estudio', email: 'marta@noviaestudio.example', phone: '', country: 'Spain', customerType: 'Bridal salon', topic: '', message: '', products: [], shades: [], volume: '500 to 2,000 m a year', address: '', page: '/wholesale', state: 'handled', createdAt: '2026-10-01T09:00:00Z' },
];

export function useInquiries() {
  return useQuery({
    queryKey: ['inquiries'],
    queryFn: async (): Promise<InquiryView[]> => {
      if (isSample) return [...sampleInquiries];
      const [{ dataConnect }, sdk] = await Promise.all([import('../lib/firebase'), import('@basis/shared/dataconnect/platform')]);
      const { data } = await sdk.listInquiries(dataConnect);
      return data.inquiries.map((row) => {
        const details = (row.details ?? {}) as { products?: string[]; shades?: string[]; volume?: string | null; address?: string | null };
        const context = (row.context ?? {}) as { page?: string };
        return {
          id: row.id,
          reference: row.reference,
          kind: row.kind,
          name: row.name,
          company: row.company ?? '',
          email: row.email,
          phone: row.phone ?? '',
          country: row.country ?? '',
          customerType: row.customerType ?? '',
          topic: row.topic ?? '',
          message: row.message ?? '',
          products: details.products ?? [],
          shades: details.shades ?? [],
          volume: details.volume ?? '',
          address: details.address ?? '',
          page: context.page ?? '',
          state: row.state,
          createdAt: row.createdAt,
        };
      });
    },
  });
}

export function useMarkInquiry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { reference: string; state: 'new' | 'handled' }): Promise<void> => {
      if (isSample) {
        const index = sampleInquiries.findIndex((inquiry) => inquiry.reference === input.reference);
        if (index >= 0) sampleInquiries[index] = { ...sampleInquiries[index]!, state: input.state };
        return;
      }
      await callFunction(FUNCTION_NAMES.markInquiry, input);
    },
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ['inquiries'] }), client.invalidateQueries({ queryKey: ['gateway'] })]),
  });
}
