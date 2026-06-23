import api from './api.service';

export interface CustomerLead {
  id: string;
  customer_name: string;
  company_name: string | null;
  leaded_by: string | null;
  is_assigned: boolean;
  sdr_id: string | null;
  conv_id: string | null;
  status: 'pending' | 'closed' | 'rejected';
  note: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
  leader_name?: string | null;
  sdr_name?: string | null;
}

export interface SDRUser {
  id: string;
  name: string;
  role: string;
}

export const customerLeadService = {
  getAll: async () => {
    const res = await api.get('/api/all-platform/customer-leads');
    return res.data?.data as CustomerLead[] || [];
  },

  getSdrs: async () => {
    const res = await api.get('/api/all-platform/customer-leads/sdrs');
    return res.data?.data as SDRUser[] || [];
  },

  create: async (data: Partial<CustomerLead>) => {
    const res = await api.post('/api/all-platform/customer-leads', data);
    return res.data;
  },

  update: async (id: string, data: Partial<CustomerLead>) => {
    const res = await api.put(`/api/all-platform/customer-leads/${id}`, data);
    return res.data;
  },

  delete: async (id: string) => {
    const res = await api.delete(`/api/all-platform/customer-leads/${id}`);
    return res.data;
  }
};
