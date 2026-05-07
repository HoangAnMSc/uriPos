<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\ProductFieldValueService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(ProductFieldValueService $fieldValueService)
    {
        return Cache::remember('products.all', 60, function () use ($fieldValueService) {
            return Product::with('contentStructure')
                ->orderBy('name')
                ->get()
                ->map(function ($p) use ($fieldValueService) {
                    return [
                        'id' => (string) $p->id,
                        'sku' => $p->sku,
                        'name' => $p->name,
                        'thumbnail' => $p->thumbnail,
                        'contentStructureId' => $p->content_structure_id,
                        'price' => (float) $p->price,
                        'quantity' => (int) $p->quantity,
                        'shortDesc' => $p->short_desc,
                        'isPublish' => (bool) $p->publish,
                        'fieldValues' => $fieldValueService->getMappedValues($p),
                    ];
                })
                ->values();
        });
    }

    public function store(Request $request, ProductFieldValueService $fieldValueService)
    {
        $data = $request->validate([
            'sku' => ['required', 'string', 'max:120', Rule::unique('products', 'sku')],
            'name' => ['required', 'string', 'max:255'],
            'thumbnail' => ['nullable', 'string', 'max:2048'],
            'content_structure_id' => ['nullable', 'integer', 'exists:content_structures,id'],
            'price' => ['required', 'numeric', 'min:0'],
            'quantity' => ['required', 'integer', 'min:0'],
            'short_desc' => ['nullable', 'string'],
            'publish' => ['nullable', 'boolean'],
            'field_values' => ['nullable', 'array'],
        ]);

        $quantity = (int) $data['quantity'];
        $isPublish = $quantity === 0
            ? false
            : (array_key_exists('publish', $data) ? (bool) $data['publish'] : true);

        $product = Product::create([
            'sku' => trim($data['sku']),
            'name' => trim($data['name']),
            'thumbnail' => $data['thumbnail'] ?? null,
            'content_structure_id' => $data['content_structure_id'] ?? null,
            'price' => $data['price'],
            'quantity' => $quantity,
            'short_desc' => $data['short_desc'] ?? null,
            'publish' => $isPublish,
        ]);

        $fieldValueService->sync($product, $data['field_values'] ?? []);

        Cache::forget('products.all');

        return response()->json([
            'id' => (string) $product->id,
            'sku' => $product->sku,
            'name' => $product->name,
            'thumbnail' => $product->thumbnail,
            'contentStructureId' => $product->content_structure_id,
            'price' => (float) $product->price,
            'quantity' => (int) $product->quantity,
            'shortDesc' => $product->short_desc,
            'isPublish' => (bool) $product->publish,
            'fieldValues' => $fieldValueService->getMappedValues($product),
        ], 201);
    }

    public function update(string $id, Request $request, ProductFieldValueService $fieldValueService)
    {
        $product = Product::findOrFail($id);

        $data = $request->validate([
            'sku' => ['sometimes', 'string', 'max:120', Rule::unique('products', 'sku')->ignore($product->id, 'id')],
            'name' => ['sometimes', 'string', 'max:255'],
            'thumbnail' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'content_structure_id' => ['sometimes', 'nullable', 'integer', 'exists:content_structures,id'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'quantity' => ['sometimes', 'integer', 'min:0'],
            'short_desc' => ['sometimes', 'nullable', 'string'],
            'publish' => ['sometimes', 'boolean'],
            'field_values' => ['sometimes', 'array'],
        ]);

        if (array_key_exists('sku', $data)) {
            $product->sku = trim($data['sku']);
        }

        if (array_key_exists('name', $data)) {
            $product->name = trim($data['name']);
        }

        if (array_key_exists('thumbnail', $data)) {
            $product->thumbnail = $data['thumbnail'];
        }

        if (array_key_exists('content_structure_id', $data)) {
            $product->content_structure_id = $data['content_structure_id'];
        }

        if (array_key_exists('price', $data)) {
            $product->price = $data['price'];
        }

        if (array_key_exists('quantity', $data)) {
            $product->quantity = (int) $data['quantity'];
        }

        if (array_key_exists('short_desc', $data)) {
            $product->short_desc = $data['short_desc'];
        }

        if ((int) $product->quantity === 0) {
            $product->publish = false;
        } elseif (array_key_exists('publish', $data)) {
            $product->publish = (bool) $data['publish'];
        }

        $product->save();

        if (array_key_exists('field_values', $data)) {
            $fieldValueService->sync($product, $data['field_values'] ?? []);
        }

        Cache::forget('products.all');

        return response()->json([
            'id' => (string) $product->id,
            'sku' => $product->sku,
            'name' => $product->name,
            'thumbnail' => $product->thumbnail,
            'contentStructureId' => $product->content_structure_id,
            'price' => (float) $product->price,
            'quantity' => (int) $product->quantity,
            'shortDesc' => $product->short_desc,
            'isPublish' => (bool) $product->publish,
            'fieldValues' => $fieldValueService->getMappedValues($product),
        ]);
    }

    public function destroy(string $id)
    {
        $product = Product::findOrFail($id);
        $product->delete();

        Cache::forget('products.all');

        return response()->json([
            'message' => 'Product deleted successfully',
        ]);
    }
}