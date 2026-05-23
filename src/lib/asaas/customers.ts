import { asaas } from './client';
import type { AsaasCustomer } from './types';

interface CreateCustomerInput {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  mobilePhone?: string;
  externalReference?: string;
}

/**
 * Cria um cliente no Asaas. CPF/CNPJ é obrigatório.
 * Retorna o ID (ex.: "cus_000001234567") que deve ser salvo na nossa tabela.
 */
export async function createCustomer(input: CreateCustomerInput): Promise<AsaasCustomer> {
  return asaas.post<AsaasCustomer>('/customers', {
    name: input.name,
    email: input.email,
    cpfCnpj: input.cpfCnpj.replace(/\D/g, ''),
    phone: input.phone,
    mobilePhone: input.mobilePhone,
    externalReference: input.externalReference,
    notificationDisabled: false,
  });
}

export async function getCustomer(customerId: string): Promise<AsaasCustomer> {
  return asaas.get<AsaasCustomer>(`/customers/${customerId}`);
}
