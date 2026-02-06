"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from 'date-fns/locale'
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type DatePickerProps = {
  value?: Date;
  onValueChange?: (date?: Date) => void;
};

export function DatePicker({ value, onValueChange }: DatePickerProps) {
  const [internalDate, setInternalDate] = React.useState<Date>();
  
  const date = value !== undefined ? value : internalDate;
  const setDate = onValueChange !== undefined ? onValueChange : setInternalDate;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : <span>dd/mm/aaaa</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          locale={ptBR}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
