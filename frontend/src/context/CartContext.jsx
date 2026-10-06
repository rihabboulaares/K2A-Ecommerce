import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import CartContext from './cartContextValue.js'
import { getPrimaryImage } from '../utils/formatters.js'
import { priceToMillimes } from '../utils/cartMath.js'

const CART_STORAGE_KEY = 'projet_amal_cart'

function readStoredCart() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const storedValue = window.localStorage.getItem(CART_STORAGE_KEY)
    const parsedValue = storedValue ? JSON.parse(storedValue) : []

    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

function normalizeQuantity(quantity, stockQuantity) {
  const parsedQuantity = Number.parseInt(quantity, 10)
  const safeQuantity = Number.isFinite(parsedQuantity) ? parsedQuantity : 1
  const safeStock = Math.max(Number.parseInt(stockQuantity, 10) || 0, 0)

  return Math.min(Math.max(safeQuantity, 1), safeStock)
}

function normalizeProduct(product) {
  const primaryImage = getPrimaryImage(product.images)

  return {
    id: product.id,
    name: product.name,
    reference: product.reference,
    price: product.price,
    stock_quantity: product.stock_quantity,
    is_active: product.is_active,
    image: primaryImage?.image || '',
    category: product.category?.name || '',
  }
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(readStoredCart)

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems))
    } catch {
      // localStorage can be unavailable in private or restricted browser modes.
    }
  }, [cartItems])

  const addToCart = useCallback((product, quantity = 1) => {
    const stockQuantity = Number.parseInt(product.stock_quantity, 10) || 0

    if (stockQuantity <= 0) {
      return { ok: false, message: 'Ce produit est en rupture de stock.' }
    }

    const requestedQuantity = Math.max(Number.parseInt(quantity, 10) || 1, 1)
    let result = {
      ok: true,
      message: 'Produit ajouté au panier.',
    }

    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id)
      const existingQuantity = existingItem?.quantity || 0
      const nextQuantity = Math.min(
        existingQuantity + requestedQuantity,
        stockQuantity,
      )

      if (nextQuantity < existingQuantity + requestedQuantity) {
        result = {
          ok: false,
          message: `Quantité limitée au stock disponible (${stockQuantity}).`,
        }
      }

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === product.id
            ? {
                ...item,
                ...normalizeProduct(product),
                quantity: nextQuantity,
              }
            : item,
        )
      }

      return [
        ...currentItems,
        {
          ...normalizeProduct(product),
          quantity: nextQuantity,
        },
      ]
    })

    return result
  }, [])

  const removeFromCart = useCallback((productId) => {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.id !== productId),
    )
  }, [])

  const updateQuantity = useCallback((productId, quantity) => {
    let result = {
      ok: true,
      message: 'Quantité mise à jour.',
    }

    setCartItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== productId) {
          return item
        }

        const nextQuantity = normalizeQuantity(quantity, item.stock_quantity)

        if (Number.parseInt(quantity, 10) > item.stock_quantity) {
          result = {
            ok: false,
            message: `Quantité limitée au stock disponible (${item.stock_quantity}).`,
          }
        }

        return {
          ...item,
          quantity: nextQuantity,
        }
      }),
    )

    return result
  }, [])

  const clearCart = useCallback(() => {
    setCartItems([])
  }, [])

  const cartCount = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems],
  )

  const cartSubtotal = useMemo(
    () =>
      cartItems.reduce(
        (total, item) => total + priceToMillimes(item.price) * item.quantity,
        0,
      ),
    [cartItems],
  )

  const value = useMemo(
    () => ({
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartCount,
      cartSubtotal,
    }),
    [
      addToCart,
      cartCount,
      cartItems,
      cartSubtotal,
      clearCart,
      removeFromCart,
      updateQuantity,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// The cart is stored only for client-side convenience. The future backend order
// flow must recalculate prices, verify stock, and confirm products are active.
