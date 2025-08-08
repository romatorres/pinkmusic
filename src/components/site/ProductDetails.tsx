'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ShoppingCart, Package, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  thumbnail: string;
  condition: string;
  available_quantity: number;
  seller_nickname: string;
  permalink: string;
  pictures: { id: string; url: string; secure_url: string }[];
  attributes?: { id: string; name: string; value_name: string }[];
}

interface ProductDetailsProps {
  product: Product;
}

const formatPrice = (price: number, currency: string) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency === 'BRL' ? 'BRL' : 'USD',
  }).format(price);
};

const getConditionText = (condition: string) => {
  const conditions: { [key: string]: string } = {
    new: 'Novo',
    used: 'Usado',
    not_specified: 'Não especificado',
  };
  return conditions[condition] || condition;
};

const ProductDetails: React.FC<ProductDetailsProps> = ({ product }) => {
  const [selectedImage, setSelectedImage] = useState(0);

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <Link
        href="/"
        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 mb-6 w-fit"
      >
        <ArrowLeft size={20} /> Voltar para a Galeria
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Imagens */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative w-full">
            <Image
              src={product.pictures?.[selectedImage]?.secure_url || product.thumbnail}
              alt={product.title}
              fill
              style={{ objectFit: 'contain' }}
              className="rounded-lg"
            />
          </div>

          {product.pictures && product.pictures.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.pictures.map((picture, index) => (
                <button
                  key={picture.id}
                  onClick={() => setSelectedImage(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 ${
                    selectedImage === index ? 'border-blue-500' : 'border-gray-200'
                  }`}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={picture.secure_url}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Informações do Produto */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Package size={16} />
                {getConditionText(product.condition)}
              </span>
              <span className="flex items-center gap-1">
                <User size={16} />
                {product.seller_nickname}
              </span>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {formatPrice(product.price, product.currency_id)}
            </div>
            <p className="text-gray-600">
              {product.available_quantity > 0
                ? `${product.available_quantity} disponível${
                    product.available_quantity > 1 ? 's' : ''
                  }`
                : 'Produto esgotado'}
            </p>
          </div>

          {/* Atributos */}
          {product.attributes && product.attributes.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-3">Características</h3>
              <div className="space-y-2">
                {product.attributes.slice(0, 8).map((attr, index) => (
                  <div
                    key={index}
                    className="flex justify-between py-1 border-b border-gray-100"
                  >
                    <span className="text-gray-600">{attr.name}:</span>
                    <span className="font-medium">{attr.value_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="border-t pt-6 space-y-3">
            <a
              href={product.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-md hover:bg-blue-600 flex items-center justify-center gap-2 font-semibold"
            >
              <ShoppingCart size={20} />
              Comprar no MercadoLivre
            </a>
            <div className="text-xs text-gray-500 text-center">ID do Produto: {product.id}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;