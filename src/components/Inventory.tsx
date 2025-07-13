// src/components/Inventory.tsx
import React, { useState, useEffect, useCallback } from 'react'; // Importa useCallback
import { db } from '../firebaseConfig'; // Importa la instancia de Firestore
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'; // Funciones de Firestore
import './Inventory.css'; // Estilos para el inventario

// Define la interfaz para un producto de inventario
interface Product {
  id?: string; // El ID es opcional al crear, pero existe una vez en Firestore
  name: string;
  category: string;
  quantity: number;
  price: number;
  // Puedes añadir más campos aquí según tus necesidades (ej. description, supplier, etc.)
}

const Inventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    name: '',
    category: '',
    quantity: 0,
    price: 0,
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null); // Para el producto que se está editando
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Referencia a la colección 'products' en Firestore
  const productsCollectionRef = collection(db, 'products');

  // Función para obtener productos de Firestore
  // Envuelve getProducts en useCallback para que su identidad sea estable
  const getProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDocs(productsCollectionRef);
      const productsData = data.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
      setProducts(productsData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Error al obtener productos:", err.message);
        setError("No se pudieron cargar los productos. " + err.message);
      } else {
        console.error("Error al obtener productos:", err);
        setError("No se pudieron cargar los productos. Error desconocido.");
      }
    } finally {
      setLoading(false);
    }
  }, [productsCollectionRef]); // getProducts depende de productsCollectionRef, que es estable

  // Cargar productos al montar el componente o cuando getProducts cambie (que no lo hará)
  useEffect(() => {
    getProducts();
  }, [getProducts]); // Añade getProducts como dependencia

  // Manejar cambios en el formulario de nuevo producto
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewProduct(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'price' ? parseFloat(value) : value
    }));
  };

  // Añadir un nuevo producto
  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newProduct.name || !newProduct.category || newProduct.quantity <= 0 || newProduct.price <= 0) {
      setError("Por favor, rellena todos los campos y asegura que cantidad y precio sean mayores que 0.");
      return;
    }
    try {
      await addDoc(productsCollectionRef, newProduct);
      setNewProduct({ name: '', category: '', quantity: 0, price: 0 }); // Limpiar formulario
      await getProducts(); // Volver a cargar la lista
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Error al añadir producto:", err.message);
        setError("No se pudo añadir el producto. " + err.message);
      } else {
        console.error("Error al añadir producto:", err);
        setError("No se pudo añadir el producto. Error desconocido.");
      }
    }
  };

  // Establecer el producto para edición
  const startEditing = (product: Product) => {
    setEditingProduct(product);
    setNewProduct(product); // Pre-rellena el formulario con los datos del producto a editar
  };

  // Actualizar un producto existente
  const updateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!editingProduct?.id) {
      setError("Error: No hay producto seleccionado para editar.");
      return;
    }
    if (!newProduct.name || !newProduct.category || newProduct.quantity <= 0 || newProduct.price <= 0) {
      setError("Por favor, rellena todos los campos y asegura que cantidad y precio sean mayores que 0.");
      return;
    }
    try {
      const productDoc = doc(db, 'products', editingProduct.id);
      await updateDoc(productDoc, { ...newProduct }); // Actualiza el documento
      setEditingProduct(null); // Sale del modo edición
      setNewProduct({ name: '', category: '', quantity: 0, price: 0 }); // Limpia el formulario
      await getProducts(); // Vuelve a cargar la lista
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Error al actualizar producto:", err.message);
        setError("No se pudo actualizar el producto. Error desconocido.");
      } else {
        console.error("Error al actualizar producto:", err);
        setError("No se pudo actualizar el producto. Error desconocido.");
      }
    }
  };

  // Eliminar un producto
  const deleteProduct = async (id: string) => {
    setError(null);
    if (!window.confirm("¿Estás seguro de que quieres eliminar este producto?")) {
      return;
    }
    try {
      const productDoc = doc(db, 'products', id);
      await deleteDoc(productDoc);
      await getProducts(); // Vuelve a cargar la lista
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Error al eliminar producto:", err.message);
        setError("No se pudo eliminar el producto. " + err.message);
      } else {
        console.error("Error al eliminar producto:", err);
        setError("No se pudo eliminar el producto. Error desconocido.");
      }
    }
  };

  return (
    <div className="inventory-container">
      <h2>Gestión de Inventario</h2>

      {error && <p className="error-message">{error}</p>}

      <form onSubmit={editingProduct ? updateProduct : addProduct} className="product-form">
        <h3>{editingProduct ? 'Editar Producto' : 'Añadir Nuevo Producto'}</h3>
        <input
          type="text"
          name="name"
          placeholder="Nombre del Producto"
          value={newProduct.name}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="category"
          placeholder="Categoría"
          value={newProduct.category}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="quantity"
          placeholder="Cantidad"
          value={newProduct.quantity}
          onChange={handleChange}
          min="0"
          required
        />
        <input
          type="number"
          name="price"
          placeholder="Precio"
          value={newProduct.price}
          onChange={handleChange}
          step="0.01"
          min="0"
          required
        />
        <button type="submit">{editingProduct ? 'Actualizar Producto' : 'Añadir Producto'}</button>
        {editingProduct && (
          <button type="button" onClick={() => {
            setEditingProduct(null);
            setNewProduct({ name: '', category: '', quantity: 0, price: 0 });
          }} className="cancel-edit-button">
            Cancelar Edición
          </button>
        )}
      </form>

      <h3>Productos Actuales</h3>
      {loading ? (
        <p>Cargando productos...</p>
      ) : products.length === 0 ? (
        <p>No hay productos en el inventario.</p>
      ) : (
        <div className="product-list">
          {products.map(product => (
            <div key={product.id} className="product-item">
              <h4>{product.name} ({product.category})</h4>
              <p>Cantidad: {product.quantity}</p>
              <p>Precio: ${product.price.toFixed(2)}</p>
              <div className="product-actions">
                <button onClick={() => startEditing(product)} className="edit-button">Editar</button>
                <button onClick={() => deleteProduct(product.id!)} className="delete-button">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Inventory;