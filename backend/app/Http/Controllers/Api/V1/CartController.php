<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Http\Request;

class CartController extends Controller
{
    // Lấy giỏ hàng của customer
    public function index(Request $request)
    {
        $customer = $request->user();

        $items = CartItem::where('customer_id', $customer->id)
            ->with('product')
            ->get()
            ->map(fn($item) => $this->formatItem($item));

        return response()->json(['data' => $items]);
    }

    // Thêm hoặc cập nhật số lượng
    public function upsert(Request $request)
    {
        $customer = $request->user();

        $data = $request->validate([
            'product_id' => 'required|uuid|exists:products,id',
            'quantity'   => 'required|integer|min:0',
        ]);

        if ($data['quantity'] === 0) {
            CartItem::where('customer_id', $customer->id)
                ->where('product_id', $data['product_id'])
                ->delete();

            return response()->json(['data' => null]);
        }

        $item = CartItem::updateOrCreate(
            ['customer_id' => $customer->id, 'product_id' => $data['product_id']],
            ['quantity' => $data['quantity']]
        );

        $item->load('product');

        return response()->json(['data' => $this->formatItem($item)]);
    }

    // Xóa toàn bộ giỏ hàng
    public function clear(Request $request)
    {
        $customer = $request->user();
        CartItem::where('customer_id', $customer->id)->delete();
        return response()->json(['message' => 'Cart cleared']);
    }

    private function formatItem(CartItem $item): array
    {
        $p = $item->product;
        return [
            'productId' => $p?->id,
            'quantity'  => $item->quantity,
        ];
    }
}
