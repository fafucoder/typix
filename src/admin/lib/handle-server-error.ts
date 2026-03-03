import { toast } from 'sonner'

interface ErrorResponse {
  response?: {
    data?: {
      title?: string
    }
  }
}

export function handleServerError(error: unknown) {
  // eslint-disable-next-line no-console
  console.log(error)

  let errMsg = 'Something went wrong!'

  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) === 204
  ) {
    errMsg = 'Content not found.'
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const err = error as ErrorResponse
    errMsg = err.response?.data?.title ?? errMsg
  }

  toast.error(errMsg)
}
