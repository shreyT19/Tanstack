// import React, { useState } from 'react'

import { DataTable } from './DataTable/DataTable'

// function App() {
//   const [leftColumnFixed, setLeftColumnFixed] = useState(false)

//   const toggleLeftColumn = () => {
//     setLeftColumnFixed(!leftColumnFixed)
//   }

//   return (
//     <div className="p-4">
//       <div className="flex items-center mb-4">
//         {/* Toggle button for fixing the left column */}
//         <button
//           onClick={toggleLeftColumn}
//           className="px-4 py-2 bg-blue-500 text-white"
//         >
//           Toggle Left Column
//         </button>
//       </div>

//       <div className="flex">
//         {/* Left fixed column */}
//         <div
//           className={`w-1/4 overflow-y-auto ${
//             leftColumnFixed ? 'sticky left-0' : ''
//           }`}
//         >
//           {/* Your content for the fixed left column */}
//           {/* For example: */}
//           <table className="min-w-full">
//             <thead className="bg-gray-200">
//               <tr>
//                 <th className="px-4 py-2">Left Column Header</th>
//               </tr>
//             </thead>
//             <tbody>
//               {/* Add rows as needed */}
//               <tr>
//                 <td className="border px-4 py-2">Left Column Data</td>
//               </tr>
//             </tbody>
//           </table>
//         </div>

//         {/* Scrollable right column */}
//         <div className="flex-1 overflow-x-auto">
//           <table className="min-w-full">
//             <thead className="bg-gray-200">
//               <tr>
//                 {/* Right Column Headers */}
//                 <th className="px-4 py-2">Header 1</th>
//                 <th className="px-4 py-2">Header 2</th>
//                 {/* Add more headers as needed */}
//               </tr>
//             </thead>
//             <tbody>
//               {/* Right Column Data */}
//               <tr>
//                 <td className="border px-4 py-2">Data 1</td>
//                 <td className="border px-4 py-2">Data 2</td>
//                 {/* Add more cells as needed */}
//               </tr>
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   )
// }

// export default App

function App() {
  return (
    <>
      <DataTable />
    </>
  )
}

export default App
