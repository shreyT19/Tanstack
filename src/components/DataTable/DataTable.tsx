import React, { useEffect } from 'react'
import './DataTable.css'
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender
} from '@tanstack/react-table'
import { MdDragIndicator } from 'react-icons/md'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { USERS, Person } from 'utils/data'

const defaultColumns: ColumnDef<Person>[] = [
  {
    accessorKey: 'customerID',
    header: () => 'Customer ID',
    id: 'customerID',
    cell: (info) => info.getValue(),
    footer: (props) => props.column.id
  },
  {
    accessorKey: 'userName',
    header: () => 'User Name',
    id: 'userName',
    cell: (info) => info.getValue(),
    footer: (props) => props.column.id
  },
  {
    accessorKey: 'emailId',
    header: () => 'Email ID',
    id: 'emailId',
    cell: (info) => info.getValue(),
    footer: (props) => props.column.id
  },
  {
    accessorKey: 'phoneNumber',
    header: () => 'Phone Number',
    id: 'phoneNumber',
    cell: (info) => info.getValue(),
    footer: (props) => props.column.id,
    size: 175
  },
  {
    accessorKey: 'description',
    header: () => 'Description',
    id: 'description',
    cell: (info) => info.getValue(),
    footer: (props) => props.column.id
  },
  {
    accessorKey: 'birthDate',
    header: () => 'Birth Date',
    id: 'birthDate',
    cell: (info: any) => new Date(info.getValue()).toLocaleDateString(),
    footer: (props) => props.column.id
  }
]

export const DataTable: React.FC = () => {
  const [data, setData] = React.useState(() => [...USERS])
  const [columns] = React.useState<typeof defaultColumns>(() => [
    ...defaultColumns
  ])

  const [columnOrder, setColumnOrder] = React.useState(
    columns.map((column) => column.id as string)
  )

  const table = useReactTable({
    data,
    columns,
    enableColumnResizing: true,

    columnResizeMode: 'onChange',
    columnResizeDirection: 'ltr',
    getCoreRowModel: getCoreRowModel(),
    onColumnOrderChange: setColumnOrder,

    state: {
      columnOrder
    },
    // you can decrease these size to shrink the columns more
    defaultColumn: {
      size: 250,
      minSize: 100
    }
  })

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="overflow-x-auto mt-4 ml-4 rounded-t-md">
        <table
          {...{
            style: {
              width: table.getTotalSize()
            }
          }}
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <DraggableColumnHeader
                    key={header.id}
                    header={header}
                    table={table}
                  />
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td
                    {...{
                      key: cell.id,
                      style: {
                        width: cell.column.getSize() + 'px',
                        maxWidth: cell.column.getSize() + 'px'
                      }
                    }}
                    className="truncate"
                  >
                    <div className="ml-12 truncate">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DndProvider>
  )
}

const reorderColumn = (
  draggedColumnId: string,
  targetColumnId: string,
  columnOrder: string[]
) => {
  columnOrder.splice(
    columnOrder.indexOf(targetColumnId),
    0,
    columnOrder.splice(columnOrder.indexOf(draggedColumnId), 1)[0] as string
  )
  return [...columnOrder]
}

const DraggableColumnHeader: React.FC<{
  header: any
  table: any
}> = ({ header, table }) => {
  const { getState, setColumnOrder } = table
  const { columnOrder } = getState()
  const { column } = header

  const [, dropRef] = useDrop({
    accept: 'column',
    drop: (draggedColumn: any) => {
      const newColumnOrder = reorderColumn(
        draggedColumn?.id,
        column.id,
        columnOrder
      )
      setColumnOrder(newColumnOrder)
    }
  })

  const [{ isDragging }, dragRef, previewRef] = useDrag({
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    item: () => column,
    type: 'column'
  })

  return (
    <th
      ref={dropRef}
      colSpan={header.colSpan}
      style={{
        width: header.getSize(),
        maxWidth: header.getSize() + 'px',
        opacity: isDragging ? 0.5 : 1
      }}
    >
      <div className="flex items-center gap-2">
        <button ref={dragRef} className="text-xl hover:cursor-grab flex-none">
          <MdDragIndicator />
        </button>
        <div className="truncate" ref={previewRef}>
          {header.isPlaceholder
            ? null
            : flexRender(header.column.columnDef.header, header.getContext())}
        </div>
      </div>
      {header.column.getCanResize() && (
        <div
          {...{
            onDoubleClick: () => header.column.resetSize(),
            onMouseDown: header.getResizeHandler(),
            onTouchStart: header.getResizeHandler(),
            className: `resizer ${table.options.columnResizeDirection} ${
              header.column.getIsResizing() ? 'isResizing' : ''
            }`
          }}
        />
      )}
    </th>
  )
}
