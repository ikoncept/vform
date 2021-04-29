import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import Errors from './Errors'
import { deepCopy } from './util'

class Form {
  [key: string]: any
  originalData: Record<string, any> = {}

  /**
   * Indicates if the form is sent to the server.
   */
  busy: boolean = false

  /**
   * Indicates if the response form the server was successful.
   */
  successful: boolean = false

  /**
   * The validation errors from the server.
   */
  errors: Errors = new Errors()

  static axios: AxiosInstance
  static routes: Record<string, string> = {}
  static errorMessage = 'Something went wrong. Please try again.'
  static ignore = ['busy', 'successful', 'errors', 'originalData']

  /**
   * Create a new form instance.
   */
  constructor (data: Record<string, any> = {}) {
    this.update(data)
  }

  /**
   * Create a new form instance.
   */
  static make<T extends typeof Form, U> (this: T, augment?: U) {
    return new this(augment) as InstanceType<T> & U
  }

  /**
   * Update the form data.
   */
  update (data: Record<string, any>) {
    this.originalData = Object.assign({}, this.originalData, deepCopy(data))

    Object.assign(this, data)
  }

  /**
   * Fill the form data.
   */
  fill (data: Record<string, any> = {}) {
    this.keys().forEach((key) => {
      (this as any)[key] = data[key]
    })
  }

  /**
   * Get the form data.
   */
  data (): Record<string, any> {
    return this.keys().reduce((data, key) => (
      { ...data, [key]: (this as any)[key] }
    ), {})
  }

  /**
   * Get the form data keys.
   */
  keys (): string[] {
    return Object.keys(this).filter(key => !Form.ignore.includes(key))
  }

  /**
   * Start processing the form.
   */
  startProcessing () {
    this.errors.clear()
    this.busy = true
    this.successful = false
  }

  /**
   * Finish processing the form.
   */
  finishProcessing () {
    this.busy = false
    this.successful = true
  }

  /**
   * Clear the form errors.
   */
  clear () {
    this.errors.clear()
    this.successful = false
  }

  /**
   * Reset the form data.
   */
  reset () {
    Object.keys(this)
      .filter(key => !Form.ignore.includes(key))
      .forEach((key) => {
        (this as any)[key] = deepCopy(this.originalData[key])
      })
  }

  /**
   * Submit the form via a GET request.
   */
  get (url: string, config: AxiosRequestConfig = {}) {
    return this.submit('get', url, config)
  }

  /**
   * Submit the form via a POST request.
   */
  post (url: string, config: AxiosRequestConfig = {}) {
    return this.submit('post', url, config)
  }

  /**
   * Submit the form via a PATCH request.
   */
  patch (url: string, config: AxiosRequestConfig = {}) {
    return this.submit('patch', url, config)
  }

  /**
   * Submit the form via a PUT request.
   */
  put (url: string, config: AxiosRequestConfig = {}) {
    return this.submit('put', url, config)
  }

  /**
   * Submit the form via a DELETE request.
   */
  delete (url: string, config: AxiosRequestConfig = {}) {
    return this.submit('delete', url, config)
  }

  /**
   * Submit the form data via an HTTP request.
   */
  submit (method: string, url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse> {
    this.startProcessing()

    if (method.toLowerCase() === 'get') {
      config.params = { ...this.data(), ...(config.params || {}) }
    } else {
      config.data = { ...this.data(), ...(config.data || {}) }
    }

    return new Promise((resolve, reject) => {
      // @ts-ignore
      (Form.axios || axios).request({ url: this.route(url), method, ...config })
        .then((response: AxiosResponse) => {
          this.finishProcessing()
          resolve(response)
        })
        .catch((error: AxiosError) => {
          this.handleErrors(error)
          reject(error)
        })
    })
  }

  /**
   * Handle the errors.
   */
  handleErrors (error: AxiosError) {
    this.busy = false

    if (error.response) {
      this.errors.set(this.extractErrors(error.response))
    }
  }

  /**
   * Extract the errors from the response object.
   */
  extractErrors (response: AxiosResponse): Record<string, any> {
    if (!response.data || typeof response.data !== 'object') {
      return { error: Form.errorMessage }
    }

    if (response.data.errors) {
      return { ...response.data.errors }
    }

    if (response.data.message) {
      return { error: response.data.message }
    }

    return { ...response.data }
  }

  /**
   * @deprecated
   */
  route (name: string, parameters: any = {}) {
    let url = name

    if (Object.prototype.hasOwnProperty.call(Form.routes, name)) {
      url = decodeURI(Form.routes[name])
    }

    if (typeof parameters !== 'object') {
      parameters = { id: parameters }
    }

    Object.keys(parameters).forEach((key) => {
      url = url.replace(`{${key}}`, parameters[key])
    })

    return url
  }

  /**
   * Clear errors on keydown.
   */
  onKeydown (event: KeyboardEvent) {
    const target = event.target as HTMLInputElement

    if (target.name) {
      this.errors.clear(target.name)
    }
  }
}

export default Form