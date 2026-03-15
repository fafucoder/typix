import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeftRight, ChevronUp, ChevronDown } from 'lucide-react'

interface TransferItem {
  id: string
  name: string
  [key: string]: any
}

interface TransferProps {
  title?: string
  data: TransferItem[]
  value: string[]
  onChange: (value: string[]) => void
  className?: string
  renderItem?: (item: TransferItem) => React.ReactNode
  searchable?: boolean
}

export function Transfer({ 
  title = '模型管理',
  data,
  value,
  onChange,
  className,
  renderItem,
  searchable = false
}: TransferProps) {
  const [search, setSearch] = React.useState('')
  const [leftSelected, setLeftSelected] = React.useState<string[]>([])
  const [rightSelected, setRightSelected] = React.useState<string[]>([])

  const leftItems = data.filter(item => !value.includes(item.id))
  const rightItems = data.filter(item => value.includes(item.id))

  const filteredLeftItems = search 
    ? leftItems.filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
    : leftItems

  const handleAdd = () => {
    const newValues = [...value, ...leftSelected]
    onChange([...new Set(newValues)])
    setLeftSelected([])
  }

  const handleRemove = () => {
    const newValues = value.filter(id => !rightSelected.includes(id))
    onChange(newValues)
    setRightSelected([])
  }

  const handleAddAll = () => {
    const newValues = [...value, ...filteredLeftItems.map(item => item.id)]
    onChange([...new Set(newValues)])
  }

  const handleRemoveAll = () => {
    onChange([])
  }

  const handleLeftSelect = (id: string, checked: boolean) => {
    if (checked) {
      setLeftSelected([...leftSelected, id])
    } else {
      setLeftSelected(leftSelected.filter(itemId => itemId !== id))
    }
  }

  const handleRightSelect = (id: string, checked: boolean) => {
    if (checked) {
      setRightSelected([...rightSelected, id])
    } else {
      setRightSelected(rightSelected.filter(itemId => itemId !== id))
    }
  }

  const handleLeftSelectAll = (checked: boolean) => {
    if (checked) {
      setLeftSelected(filteredLeftItems.map(item => item.id))
    } else {
      setLeftSelected([])
    }
  }

  const handleRightSelectAll = (checked: boolean) => {
    if (checked) {
      setRightSelected(rightItems.map(item => item.id))
    } else {
      setRightSelected([])
    }
  }

  return (
    <div className={cn('w-full', className)}>
      {title && <h4 className='font-medium mb-3'>{title}</h4>}
      
      <div className='flex items-center w-full gap-2'>
        {/* Left Side - Available Models */}
        <div className='flex-1 space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center'>
              <span className='text-sm font-medium mr-4'>可用模型</span>
              <div className='flex items-center px-2 py-1 text-xs'>
                <Checkbox
                  checked={leftSelected.length === filteredLeftItems.length && filteredLeftItems.length > 0}
                  onCheckedChange={handleLeftSelectAll}
                  className='mr-2'
                />
                <span>全选</span>
              </div>
            </div>
            <span className='text-xs text-muted-foreground'>{filteredLeftItems.length}</span>
          </div>
          
          <ScrollArea className='h-48 border rounded-md'>
            <div className='p-2 space-y-1'>
              {filteredLeftItems.length === 0 ? (
                <div className='text-center text-muted-foreground text-sm py-4'>
                  无可用模型
                </div>
              ) : (
                filteredLeftItems.map(item => (
                  <div key={item.id} className='flex items-center px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer'>
                    <Checkbox
                      checked={leftSelected.includes(item.id)}
                      onCheckedChange={(checked) => handleLeftSelect(item.id, checked as boolean)}
                      className='mr-2'
                    />
                    <div className='flex-1 min-w-0'>
                      {renderItem ? renderItem(item) : (
                        <span className='text-sm truncate'>{item.name}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Middle - Controls */}
        <div className='flex flex-col items-center justify-center gap-2 w-12'>
          <Button
            variant='outline'
            size='icon'
            onClick={handleAdd}
            disabled={leftSelected.length === 0}
          >
            <ChevronRight size={16} />
          </Button>
          <Button
            variant='outline'
            size='icon'
            onClick={handleAddAll}
            disabled={filteredLeftItems.length === 0}
          >
            <ArrowRight size={16} />
          </Button>
          <Button
            variant='outline'
            size='icon'
            onClick={handleRemove}
            disabled={rightSelected.length === 0}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant='outline'
            size='icon'
            onClick={handleRemoveAll}
            disabled={rightItems.length === 0}
          >
            <ArrowLeft size={16} />
          </Button>
        </div>

        {/* Right Side - Selected Models */}
        <div className='flex-1 space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center'>
              <span className='text-sm font-medium mr-4'>已选模型</span>
              <div className='flex items-center px-2 py-1 text-xs'>
                <Checkbox
                  checked={rightSelected.length === rightItems.length && rightItems.length > 0}
                  onCheckedChange={handleRightSelectAll}
                  className='mr-2'
                />
                <span>全选</span>
              </div>
            </div>
            <span className='text-xs text-muted-foreground'>{rightItems.length}</span>
          </div>
          
          <ScrollArea className='h-48 border rounded-md'>
            <div className='p-2 space-y-1'>
              {rightItems.length === 0 ? (
                <div className='text-center text-muted-foreground text-sm py-4'>
                  未选择模型
                </div>
              ) : (
                rightItems.map(item => (
                  <div key={item.id} className='flex items-center px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer'>
                    <Checkbox
                      checked={rightSelected.includes(item.id)}
                      onCheckedChange={(checked) => handleRightSelect(item.id, checked as boolean)}
                      className='mr-2'
                    />
                    <div className='flex-1 min-w-0'>
                      {renderItem ? renderItem(item) : (
                        <span className='text-sm truncate'>{item.name}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}

const ArrowRight = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
)

const ArrowLeft = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
)

const ChevronRight = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
)

const ChevronLeft = ({ size = 20, className }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
)