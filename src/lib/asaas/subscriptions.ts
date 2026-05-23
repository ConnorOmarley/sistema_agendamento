import { asaas } from './client';
import type { AsaasSubscription, AsaasCreditCardData, AsaasCreditCardHolderInfo } from './types';

interface CreateSubscriptionInput {
  customerId: string;
  value: number;
  nextDueDate: string; // 'YYYY-MM-DD' — primeira cobrança (ideal: fim do trial)
  description: string;
  creditCard: AsaasCreditCardData;
  creditCardHolderInfo: AsaasCreditCardHolderInfo;
  remoteIp: string; // IP do usuário no momento da cobrança (anti-fraude)
  externalReference?: string;
}

/**
 * Cria assinatura recorrente mensal cobrada no cartão.
 *
 * IMPORTANTE: os dados do cartão NÃO devem ser persistidos.
 * Após o primeiro charge, o Asaas tokeniza o cartão internamente.
 */
export async function createCreditCardSubscription(
  input: CreateSubscriptionInput
): Promise<AsaasSubscription> {
  return asaas.post<AsaasSubscription>('/subscriptions', {
    customer: input.customerId,
    billingType: 'CREDIT_CARD',
    cycle: 'MONTHLY',
    value: input.value,
    nextDueDate: input.nextDueDate,
    description: input.description,
    externalReference: input.externalReference,
    creditCard: {
      holderName: input.creditCard.holderName,
      number: input.creditCard.number.replace(/\s/g, ''),
      expiryMonth: input.creditCard.expiryMonth.padStart(2, '0'),
      expiryYear: input.creditCard.expiryYear.length === 2
        ? `20${input.creditCard.expiryYear}`
        : input.creditCard.expiryYear,
      ccv: input.creditCard.ccv,
    },
    creditCardHolderInfo: {
      name: input.creditCardHolderInfo.name,
      email: input.creditCardHolderInfo.email,
      cpfCnpj: input.creditCardHolderInfo.cpfCnpj.replace(/\D/g, ''),
      postalCode: input.creditCardHolderInfo.postalCode.replace(/\D/g, ''),
      addressNumber: input.creditCardHolderInfo.addressNumber,
      addressComplement: input.creditCardHolderInfo.addressComplement,
      phone: input.creditCardHolderInfo.phone.replace(/\D/g, ''),
      mobilePhone: input.creditCardHolderInfo.mobilePhone?.replace(/\D/g, ''),
    },
    remoteIp: input.remoteIp,
  });
}

export async function getSubscription(subscriptionId: string): Promise<AsaasSubscription> {
  return asaas.get<AsaasSubscription>(`/subscriptions/${subscriptionId}`);
}

export async function cancelSubscription(subscriptionId: string): Promise<{ deleted: boolean; id: string }> {
  return asaas.delete<{ deleted: boolean; id: string }>(`/subscriptions/${subscriptionId}`);
}
