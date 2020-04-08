export const isNull = (arr) => {
  return arr.length === 0
}

export const car = (arr) => {
  if (arr.length === 0) { throw new Error('CAR -- Can not car null') }
  return arr[0]
}

export const cdr = (arr) => {
  if (arr.length === 0) { throw new Error('CDR -- Can not cdr null') }
  return arr.slice(1)
}

export const cons = (item, arr) => {
  return [item, ...arr]
}

export const merge = (...arrList) => {
  return arrList.reduce((arr1, arr2) => {
    return arr1.concat(arr2)
  }, [])
}

export const last = (arr) => {
  return arr[arr.length - 1]
}

export const includes = (arr, item) => arr.includes(item)

export const flatten = (arr) => arr.reduce((a, b) => a.concat(b), [])
