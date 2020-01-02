exports.isNull = (arr) => {
  return arr.length === 0
}

exports.car = (arr) => {
  if (arr.length === 0) { throw new Error('CAR -- Can nor car null') }
  return arr[0]
}

exports.cdr = (arr) => {
  if (arr.length === 0) { throw new Error('CDR -- Can not cdr null') }
  return arr.slice(1)
}

exports.cons = (item, arr) => {
  return [item, ...arr]
}

exports.merge = (...arrList) => {
  return arrList.reduce((arr1, arr2) => {
    return arr1.concat(arr2)
  }, [])
}

exports.last = (arr) => {
  return arr[arr.length - 1]
}

exports.hasOne = (arr, item) => arr.indexOf(item) > -1

exports.flatten = (arr) => arr.reduce((a, b) => a.concat(b), [])
