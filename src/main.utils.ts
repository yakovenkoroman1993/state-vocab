export const toLocalDatetimeString = (date: Date | null) => {
  if (date === null) {
    return new Date().toISOString().slice(0, 16)
  }

  const offset = date.getTimezoneOffset() * 60000

  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export const toDateString = (date: Date | null) => {
  if (!date) {
    return
  }

  const offset = date.getTimezoneOffset() * 60000
  
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}