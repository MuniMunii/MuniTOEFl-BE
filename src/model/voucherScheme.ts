import {z}from 'zod'
export const VoucherScheme=z.object({
    id:z.string(),
    typeV:z.enum(['listening','reading','speaking','writing']),
    // duration in month jadi if choose 1 berati durasi 1 month
    duration:z.enum(['1','3','5']),
    used:z.boolean(),
    createdAt:z.date()
})
export const ActivatedVoucherScheme=z.object({
    id:z.string(),
    usedBy:z.string(),
    typeV:z.enum(['listening','reading','speaking','writing']),
    activatedAt:z.date(),
    expiredAt:z.date()
})
export type VoucherType=z.infer<typeof VoucherScheme>
export type ActivatedVoucherType=z.infer<typeof ActivatedVoucherScheme>