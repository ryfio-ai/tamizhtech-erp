"use client";

import { useFieldArray, Control, UseFormRegister, UseFormWatch } from "react-hook-form";
import { InvoiceFormValues } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

interface InvoiceLineItemsProps {
  control: Control<InvoiceFormValues>;
  register: UseFormRegister<InvoiceFormValues>;
  watch: UseFormWatch<InvoiceFormValues>;
  errors: any;
}

export function InvoiceLineItems({ control, register, watch, errors }: InvoiceLineItemsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchItems = watch("items") || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-navy">Line Items</h3>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={() => append({ description: "", qty: 1, unitPrice: 0 })}
          className="h-8 gap-1 bg-white hover:bg-gray-50 text-brand border-gray-200"
        >
          <Plus className="w-3.5 h-3.5" /> Add Item
        </Button>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="grid grid-cols-12 gap-2 p-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-6 md:col-span-7">Description</div>
          <div className="col-span-2 text-right">Qty</div>
          <div className="col-span-3 md:col-span-2 text-right">Unit Price</div>
          <div className="col-span-1 text-center"></div>
        </div>

        <div className="p-3 space-y-3">
          {fields.map((field, index) => {
             const qty = watchItems[index]?.qty || 0;
             const price = watchItems[index]?.unitPrice || 0;
             const lineTotal = qty * price;

             return (
               <div key={field.id} className="grid grid-cols-12 gap-2 items-start relative group">
                  <div className="col-span-6 md:col-span-7 space-y-1">
                    <Input 
                      {...register(`items.${index}.description`)} 
                      placeholder="Item description" 
                      className="h-9"
                    />
                    {errors?.items?.[index]?.description && (
                      <p className="text-[10px] text-red-500">{errors.items[index].description.message}</p>
                    )}
                  </div>
                  
                  <div className="col-span-2 space-y-1">
                    <Input 
                      type="number"
                      {...register(`items.${index}.qty`, { valueAsNumber: true })} 
                      className="h-9 text-right"
                    />
                    {errors?.items?.[index]?.qty && (
                      <p className="text-[10px] text-red-500">{errors.items[index].qty.message}</p>
                    )}
                  </div>

                  <div className="col-span-3 md:col-span-2 space-y-1">
                    <Input 
                      type="number"
                      {...register(`items.${index}.unitPrice`, { valueAsNumber: true })} 
                      className="h-9 text-right"
                    />
                    {errors?.items?.[index]?.unitPrice && (
                      <p className="text-[10px] text-red-500">{errors.items[index].unitPrice.message}</p>
                    )}
                  </div>

                  <div className="col-span-12 md:col-span-1 flex items-center justify-end md:justify-center md:h-9 mt-2 md:mt-0">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 relative bottom-1 md:bottom-auto"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Mobile Row Total */}
                  <div className="col-span-12 md:hidden text-right text-xs text-gray-500 font-medium mb-2 border-b border-gray-100 pb-2">
                    Line Total: ₹{lineTotal.toFixed(2)}
                  </div>
               </div>
             )
          })}
        </div>
        
        {fields.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-500">
            No items added. Please add at least one item.
          </div>
        )}
      </div>
    </div>
  );
}
