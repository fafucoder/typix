import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Calendar as CalendarIcon, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type DateTimePickerProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = '选择日期时间',
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const date = value ? parseISO(value) : undefined

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const currentDate = date || new Date()
      selectedDate.setHours(currentDate.getHours())
      selectedDate.setMinutes(currentDate.getMinutes())
      onChange(selectedDate.toISOString().slice(0, 16))
    }
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value
    if (date) {
      const [hours, minutes] = timeValue.split(':').map(Number)
      const newDate = new Date(date)
      newDate.setHours(hours)
      newDate.setMinutes(minutes)
      onChange(newDate.toISOString().slice(0, 16))
    } else {
      const today = new Date()
      const [hours, minutes] = timeValue.split(':').map(Number)
      today.setHours(hours)
      today.setMinutes(minutes)
      onChange(today.toISOString().slice(0, 16))
    }
  }

  const formatDisplay = () => {
    if (!date) return placeholder
    return format(date, 'yyyy/MM/dd HH:mm')
  }

  const getTimeValue = () => {
    if (!date) return ''
    return format(date, 'HH:mm')
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          className={cn(
            'w-full justify-start text-start font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className='mr-2 h-4 w-4' />
          {formatDisplay()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <div className='p-3'>
          <Calendar
            mode='single'
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
          />
          <div className='mt-3 flex items-center gap-2 border-t pt-3'>
            <Clock className='h-4 w-4 text-muted-foreground' />
            <Input
              type='time'
              value={getTimeValue()}
              onChange={handleTimeChange}
              className='w-24'
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
