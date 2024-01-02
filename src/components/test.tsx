import React, { useEffect, useRef, useState } from 'react'
import {
  RecoilState,
  useRecoilRefresher_UNSTABLE,
  useRecoilValueLoadable,
  useSetRecoilState
} from 'recoil'

import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

import { IPayments, IPaymentsInput } from '../../types/payments.types'

import DataTable from '../../stories/data-table/DataTable'
import { useNavigate, useParams } from 'react-router'
import {
  currentPaymentAtom,
  currentPaymentSelector,
  paymentsPaginationAtom
} from '../../store/atoms/paymentsAtom'
import Spinner from '../../components/spinner/Spinner'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import useDocumentTitle from '../../utils/useDocumentTitle'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import { CommunicationService } from '../../service/communication.service'
import { useNotifications } from '../../providers/NotificationProvider'
import { ButtonMain } from '../../stories/buttons/ButtonMain'
import {
  getHumanReadableDate,
  getHumanReadableTime
} from '../../utils/dateUtils'

import CopyIcon from '../../assets/payments/copyButton.svg'
import { Transition } from '@headlessui/react'

import BankTransferIcon from '../../assets/payments/BankTransfer.svg'
import CardIcon from '../../assets/payments/Card.svg'
import StripeLogoIcon from '../../assets/payments/StripeLogo.svg'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { InvoicesAmount, PaymentParts, date2unix } from './AddNewPayment'
import { InvoiceService } from '../../service/invoice.service'
import { PaymentsService } from '../../service/payments.service'
import dayjs from 'dayjs'
import { extractErrorMessage } from '../../utils/error'
import { IInvoice } from '../../types/invoice.types'
import SidePanel from '../../stories/modals/SidePanel'
import BreadcrumbMain from '../../stories/breadCrumbs/BreadCrumbMain'

const validationSchema = yup.object().shape({
  payment_parts: yup.array().of(
    yup.object({
      invoice_id: yup.string().required('Please select an invoice'),
      amount: yup.number().required('Please enter the amount')
    })
  )
})

function ViewPayments() {
  useDocumentTitle('View Payments')
  const [openInvoicesDataTable, setOpenInvoicesDataTable] =
    useState<boolean>(true)
  const [showEditPaymentSidePanel, setShowEditPaymentSidePanel] =
    useState<boolean>(false)
  const currentPayment = useRecoilValueLoadable(currentPaymentSelector)
  const currentPaymentRefresher = useRecoilRefresher_UNSTABLE(
    currentPaymentSelector
  )
  const [paymentDetails, setPaymentDetails] = useState<IPayments | undefined>(
    undefined
  )
  const { setSuccessNotification, setErrorNotification } = useNotifications()
  const communicationService = CommunicationService()
  const [downloadReceiptLoading, setDownloadReceiptLoading] =
    useState<boolean>(false)
  const [emailReceiptLoading, setEmailReceiptLoading] = useState<boolean>(false)

  const setCurrentPaymentId = useSetRecoilState(currentPaymentAtom)

  const navigate = useNavigate()

  const { id } = useParams()
  const [isCopied, setIsCopied] = useState<boolean>(false)
  const [isAnimationLoading, setIsAnimationLoading] = useState<boolean>(false)
  const {
    getValues,
    setValue,
    handleSubmit,
    control,
    formState: { errors }
  } = useForm<IPaymentsInput>({
    reValidateMode: 'onChange',
    resolver: yupResolver(validationSchema)
  })
  const [invoices, setInvoices] = useState<PaymentParts>([])
  const [defaultInvoices, setDefaultInvoices] = useState<
    IInvoice[] | undefined
  >()
  const invoiceService = InvoiceService()
  const [customer, setCustomer] = useState<any>(null)

  const invoice_mapped = (_invoices: any[]) => {
    return _invoices?.map((_invoice: any) => ({
      ..._invoice,
      value: _invoice.invoice_id,
      label: _invoice.invoice_number
    }))
  }

  const loadInvoiceOptions = (inputValue: string) => {
    return new Promise((resolve) => {
      invoiceService
        .getFilteredInvoicesByInvoiceNumber(
          { limit: 500 },
          inputValue,
          customer?.id
        )
        .then((data) => {
          resolve(invoice_mapped(data.results))
        })
    })
  }

  useEffect(() => {
    if (customer?.id) {
      loadInvoiceOptions('').then((invoiceOptions: any) => {
        setDefaultInvoices(invoiceOptions)
      })
    }
  }, [customer])

  useEffect(() => {
    if (id && currentPayment.state === 'hasValue' && currentPayment.contents) {
      setCustomer({
        ...currentPayment.contents,
        id: currentPayment.contents?.customer_id,
        value: currentPayment.contents?.customer_id,
        label: currentPayment.contents?.customer_name
      })
      setValue('amount', currentPayment.contents?.amount)
    }
  }, [currentPayment, id])

  useEffect(() => {
    if (defaultInvoices && currentPayment.state === 'hasValue') {
      const _invoices = currentPayment.contents?.invoices?.map(
        (invoice: any, index: number) => {
          const _invoice = defaultInvoices?.find(
            (item: any) => item?.invoice_number === invoice?.invoice_number
          )

          return {
            ...invoice,
            value: invoice.invoice_id,
            label: invoice.invoice_number ?? invoice.invoice_id,
            amount: Number(invoice.amount),
            amount_due: _invoice?.amount_due
          }
        }
      )
      setInvoices(_invoices)
      setValue('payment_parts', _invoices)
    }
  }, [currentPayment, defaultInvoices])

  const onSubmit = async (data: any) => {
    try {
      let invoicesAddedAmount: number = 0
      invoices.map((item) => (invoicesAddedAmount += Number(item.amount)))

      //validation

      if (invoicesAddedAmount && invoicesAddedAmount > data.amount) {
        setErrorNotification(
          'Invoices amount should not exceed the amount received'
        )
        return
      }
      const paymentPartsMapped: any = invoices.map(
        ({ invoice_id, amount }) => ({
          invoice_id,
          amount: Number(amount) * 100
        })
      )

      setIsAnimationLoading(true)

      const prevInvoices = currentPayment.contents?.invoices

      prevInvoices?.forEach((invoice: any) => {
        if (
          !paymentPartsMapped?.filter(
            (p) => p.invoice_id === invoice.invoice_id
          ).length
        ) {
          paymentPartsMapped.push({
            invoice_id: invoice.invoice_id,
            amount: 0
          })
        }
      })

      const fulldata = {
        payment_parts: paymentPartsMapped
      }

      await PaymentsService().updatePayment(id ?? '', fulldata)

      setSuccessNotification(`Payment Updated Successfully`)
      setIsAnimationLoading(false)
      setShowEditPaymentSidePanel(false)
      currentPaymentRefresher()
    } catch (err) {
      setErrorNotification(extractErrorMessage(err))
      setIsAnimationLoading(false)
    }
  }
  useEffect(() => {
    if (id) {
      // Known Issue with Recoiljs, where the selector does not load again if there is an async call inside the get
      // https://github.com/facebookexperimental/Recoil/issues/103
      // Workaround is to force Refresh the Selector. Not a scalable solution we should investigate it further.
      setCurrentPaymentId(id)
      currentPaymentRefresher()
    }
  }, [id])
  useEffect(() => {
    if (currentPayment.state === 'hasValue' && currentPayment.contents) {
      setPaymentDetails(currentPayment.contents)
    }
  }, [currentPayment])

  const downloadPaymentReceipt = async (id: any) => {
    setDownloadReceiptLoading(true)
    const response = await communicationService
      .downloadPaymentReceipt(id!)
      .catch((err) => {
        setDownloadReceiptLoading(false)
        setErrorNotification('Error downloading PaymentReceipt')
      })
    setDownloadReceiptLoading(false)
    if (response) {
      setSuccessNotification('Downloaded payment receipt successfully')
      const linkSource = `data:application/pdf;base64,${response}`
      const downloadLink = document.createElement('a')
      const fileName = `PaymentReceipt-${id}.pdf`
      downloadLink.href = linkSource
      downloadLink.download = fileName
      downloadLink.click()
    } else {
      setErrorNotification('Error downloading PaymentReceipt')
    }
  }

  const emailPaymentReceipt = async (paymentDetails: any) => {
    setEmailReceiptLoading(true)
    // Since paymentDetails has amount in dollars and the sendPaymentReceiptEmail needs amount to be in cents
    let paymentDetailsCopy = { ...paymentDetails }
    paymentDetailsCopy = {
      ...paymentDetailsCopy,
      amount: paymentDetails['amount'] * 100
    }
    const response = await communicationService
      .sendPaymentReceiptEmail(
        paymentDetailsCopy,
        paymentDetailsCopy['invoices']
      )
      .catch((err) => {
        setEmailReceiptLoading(false)
        setErrorNotification('Error emailing PaymentReceipt')
      })
    setEmailReceiptLoading(false)
    if (response) {
      setSuccessNotification('Emailed payment receipt successfully')
    } else {
      setErrorNotification('Error emailing PaymentReceipt')
    }
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard
      .writeText(paymentDetails?.external_id || '')
      .then(() => {
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 3000)
      })
      .catch((err) => {
        console.error('Unable to copy to clipboard', err)
      })
  }

  const handleRedirectViewCustomerDetails = () => {
    navigate(`/customers/${paymentDetails?.customer_id}/view`)
  }

  const allowedFieldsMap = {
    invoice_number: 'Invoice Number',
    amount: 'Payment/invoice',
    status: 'Status',
    invoice_total: 'Invoice amount',
    created_at: 'Invoice Date'
  }

  const methodIcons: any = {
    bank_transfer: BankTransferIcon,
    card: CardIcon,
    ach_credit_transfer: BankTransferIcon
  }

  const PaymentMethodIcon =
    methodIcons[paymentDetails?.payment_method || ''] || null

  return (
    //  to take up the extra space around the page
    <div className="md:w-[calc(100vw-19rem)]  md:h-[calc(100dvh+1rem)] overflow-visible relative -mt-7">
      {currentPayment.state !== 'hasValue' ? (
        <div className="h-full w-full bg-white flex items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <>
          {/* overlay:fix for white color background */}
          <div className="w-full top-0 left-0 h-full fixed bg-[#1D2235] -z-[10]" />
          <div className=" md:-ml-5">
            <div className="w-full pt-5 pb-2">
              <BreadcrumbMain
                key={id}
                items={{
                  Home: '/payments',
                  'Payment ID': '',
                  [id ?? '']: ''
                }}
              />
            </div>
            {/* left side */}
            <div className="flex gap-2 lg:h-full md:flex-row flex-col">
              <div className="flex-1 bg-white h-screen overflow-y-auto rounded-lg md:rounded-t-lg md:rounded-none">
                <div className="flex items-center justify-between px-6 py-6 border-b  border-gray-750">
                  <div className="text-xl font-bold text-gray-8000 py-[6px]">
                    Payment Details
                  </div>
                  <div>
                    {paymentDetails?.status === 'success' && (
                      <div className="flex gap-3">
                        {downloadReceiptLoading ? (
                          <Spinner />
                        ) : (
                          <ButtonMain
                            variant="secondary"
                            onClick={() => {
                              downloadPaymentReceipt(paymentDetails?.id)
                            }}
                            className="flex gap-1 items-center justify-center"
                          >
                            <FileDownloadOutlinedIcon className="h-4 w-4" />
                            Download
                          </ButtonMain>
                        )}
                        {emailReceiptLoading ? (
                          <Spinner />
                        ) : (
                          <ButtonMain
                            onClick={() => {
                              emailPaymentReceipt(paymentDetails)
                            }}
                            className="flex gap-1 items-center justify-center"
                          >
                            <EmailOutlinedIcon className="h-4 w-4" />
                            Email
                          </ButtonMain>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 lg:grid-cols-4 px-6 py-7 border-b border-gray-750 gap-7">
                  <FlexBoxComponent
                    title="Customer"
                    description={
                      <div onClick={handleRedirectViewCustomerDetails}>
                        {paymentDetails?.customer_name}
                      </div>
                    }
                  />
                  <FlexBoxComponent
                    title="Payment Mode"
                    description={
                      <div className="flex items-center gap-1">
                        <div className="flex gap-1 items-center">
                          {PaymentMethodIcon && (
                            <img
                              className="h-[10px]"
                              src={PaymentMethodIcon}
                              alt=""
                            />
                          )}
                          {paymentDetails?.payment_method_details?.last4 ? (
                            <span className="text-[10px]">
                              XX {paymentDetails?.payment_method_details?.last4}
                            </span>
                          ) : (
                            <span className="text-xs font-bold first-letter:uppercase">
                              {paymentDetails?.payment_method}
                            </span>
                          )}
                        </div>
                        {paymentDetails?.connector_name && (
                          <div className="p-1 flex gap-1 items-center bg-violet-50">
                            <img src={StripeLogoIcon} alt="StripeLogo" />
                            <div className="text-[8px] text-violet-1000 font-semibold uppercase">
                              {paymentDetails?.connector_name}
                            </div>
                          </div>
                        )}
                      </div>
                    }
                  />
                  <FlexBoxComponent
                    title="Type"
                    description={paymentDetails?.type || ''}
                  />
                  <FlexBoxComponent
                    title={`Amount ${
                      paymentDetails?.type === 'refund'
                        ? 'Refunded'
                        : 'Received'
                    }`}
                    description={
                      <div className="flex gap-2 items-center">
                        <span>
                          {paymentDetails?.currency_code?.toUpperCase() ===
                          'USD'
                            ? '$'
                            : '₹'}
                          {paymentDetails?.amount || ''}
                        </span>
                        <div
                          className={`flex gap-1 items-center px-2 py-1 text-[9px] rounded ${
                            paymentDetails?.status === 'success'
                              ? 'opacity-100 bg-green-60 text-green-7000'
                              : 'opacity-60 bg-primary-70 text-primary-1200'
                          }`}
                        >
                          <span
                            className={`rounded-full w-1 h-1 bg-primary-550 opacity-50" ${
                              paymentDetails?.status === 'success'
                                ? 'bg-green-7000'
                                : 'bg-primary-1200'
                            }`}
                          />
                          <p className=" first-letter:uppercase font-bold">
                            {paymentDetails?.status || ''}
                          </p>
                        </div>
                      </div>
                    }
                  />
                  <FlexBoxComponent
                    title={`${paymentDetails?.type} Date & Time`}
                    description={
                      getHumanReadableDate(paymentDetails?.timestamp || '') +
                      ' ' +
                      getHumanReadableTime(paymentDetails?.timestamp || '')
                    }
                  />
                  <FlexBoxComponent
                    title="External Transaction ID"
                    description={
                      paymentDetails?.external_id && (
                        <div className="flex items-center gap-3">
                          <span className="truncate w-[100px]">
                            {paymentDetails?.external_id || ''}
                          </span>
                          {isCopied ? (
                            <CheckCircleIcon
                              className="w-4 text-green-7000"
                              data-testid="view-payments-copied-icon"
                            />
                          ) : (
                            <img
                              src={CopyIcon}
                              alt="copy"
                              className="cursor-pointer"
                              onClick={handleCopyToClipboard}
                              data-testid="view-payments-external-id-copy-button"
                            />
                          )}
                        </div>
                      )
                    }
                  />
                </div>
                <div className="flex items-center justify-between px-6 pt-7 pb-8 flex-col gap-4">
                  <div className="flex items-center justify-between text-gray-8000 w-full">
                    <div
                      className="text-sm font-semibold flex gap-1 items-center cursor-pointer"
                      onClick={() => setOpenInvoicesDataTable((prev) => !prev)}
                      data-testid="view-payments-invoices-expand-button"
                    >
                      <span>Invoices</span>
                      <span
                        className={`duration-200 rounded-full ${
                          openInvoicesDataTable ? 'rotate-0' : 'rotate-180'
                        }`}
                      >
                        <ExpandMoreIcon />
                      </span>
                    </div>

                    <div
                      className="text-xs font-bold cursor-pointer flex gap-1 items-center"
                      onClick={() => setShowEditPaymentSidePanel(true)}
                      data-testid="view-payments-edit-invoices-button"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="17"
                        viewBox="0 0 16 17"
                        fill="none"
                      >
                        <rect
                          width="16"
                          height="16"
                          transform="translate(0 0.5)"
                          fill="white"
                        />
                        <path
                          d="M9.80841 3.87602C9.92762 3.75681 10.0691 3.66224 10.2249 3.59772C10.3807 3.53321 10.5476 3.5 10.7162 3.5C10.8848 3.5 11.0517 3.53321 11.2075 3.59772C11.3632 3.66224 11.5048 3.75681 11.624 3.87602C11.7432 3.99523 11.8378 4.13676 11.9023 4.29251C11.9668 4.44827 12 4.61521 12 4.78381C12 4.9524 11.9668 5.11934 11.9023 5.2751C11.8378 5.43086 11.7432 5.57238 11.624 5.69159L5.49642 11.8192L3 12.5L3.68084 10.0036L9.80841 3.87602Z"
                          stroke="#334155"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M8 13.5L13 13.5"
                          stroke="#334155"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span>EDIT</span>
                    </div>
                  </div>
                  <Transition
                    show={openInvoicesDataTable}
                    className={`w-full  ${
                      paymentDetails?.invoices?.length ? ' border' : ''
                    }`}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    {paymentDetails?.invoices?.length ? (
                      <div
                        className="w-full"
                        data-testid="view-payments-invoices-datatable"
                      >
                        <DataTable
                          columnsMap={allowedFieldsMap}
                          data={paymentDetails?.invoices ?? []}
                          // onClick={() => {}}
                          // onRowClick={() => {}}
                          type="paymentsInvoice"
                          showActions={false}
                        />
                      </div>
                    ) : (
                      <div className="w-full flex justify-center p-4">
                        <span className="text-primary-500 font-medium text-sm border-none py-10">
                          No invoice found
                        </span>
                      </div>
                    )}
                  </Transition>
                </div>
              </div>
              {/* right side */}
              {paymentDetails?.transactions?.length ? (
                <div className="flex flex-col items-start flex-[0.3]  bg-white rounded-lg md:rounded-tl-lg md:rounded-none">
                  <div className="px-6 py-8 text-base font-bold border-b w-full mb-6">
                    Timeline
                  </div>
                  <div className="w-full">
                    {paymentDetails?.transactions?.map((item, index) => (
                      <TimelineStamp
                        key={index}
                        title={item?.status}
                        date={item?.timestamp}
                        border={index < paymentDetails.transactions?.length - 1}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                ''
              )}
            </div>
          </div>
        </>
      )}
      <SidePanel
        open={showEditPaymentSidePanel}
        setOpen={setShowEditPaymentSidePanel}
        panelHeadingTitle="Edit Payment"
        panelHeadingDescription="Adding/Editing for invoices and payment amounts."
        children={
          <form
            className="flex flex-col h-full justify-between w-full relative"
            onSubmit={handleSubmit(onSubmit)}
            data-testid="view-payments-edit-invoices-sidepanel"
          >
            <div className="w-full">
              <InvoicesAmount
                invoices={invoices}
                control={control}
                defaultInvoices={defaultInvoices || []}
                setInvoices={setInvoices}
                setValue={setValue}
                getValues={getValues}
                errors={errors}
              />
            </div>
            <div
              className="flex justify-end gap-2 fixed bottom-0 z-10 p-4 bg-white w-full right-0"
              style={{
                boxShadow: '0px -1px 7px 0px rgba(0, 0, 0, 0.10)'
              }}
            >
              <ButtonMain
                children="Cancel"
                variant="secondary"
                onClick={() => setShowEditPaymentSidePanel(false)}
              />
              <ButtonMain
                type="submit"
                isLoading={isAnimationLoading}
                children={
                  isAnimationLoading ? 'Updating Payment' : 'Update Payment'
                }
                data-testid="view-payments-edit-invoices-sidepanel-update-button"
              />
            </div>
          </form>
        }
      />
    </div>
  )
}

const FlexBoxComponent = ({
  title,
  description
}: {
  title: string
  description: any
}) => {
  return (
    <div className="flex flex-col gap-[11px]">
      <div className="text-xs font-normal text-gray-5000 first-letter:capitalize truncate">
        {title}
      </div>
      <div
        className={`${
          title === 'Customer'
            ? 'text-blue-1000 cursor-pointer hover:underline transition-all'
            : 'text-gray-8000'
        } font-semibold text-[13px] first-letter:capitalize truncate`}
      >
        {description}
      </div>
    </div>
  )
}

interface TimelineProps {
  title: string
  date: string
  border?: boolean
}

const TimelineStamp = ({ title, date, border }: TimelineProps) => {
  const formattedDate =
    getHumanReadableDate(date) + ' ' + getHumanReadableTime(date)

  return (
    <div className="flex px-6 flex-col gap-1">
      <div className="flex  items-center  gap-2">
        <CheckCircleIcon className="h-4 text-gray-4000" />
        <span className="text-[13px] font-semibold first-letter:capitalize">
          {title}
        </span>
      </div>
      <p
        className={`h-12 pl-4 w-full text-[10px]  text-gray-4000 font-semibold ml-2 ${
          border ? 'border-l border-gray-2000 ' : ''
        }`}
      >
        {formattedDate}
      </p>
    </div>
  )
}

export default ViewPayments
