<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Services\CustomerPointService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function __construct(private CustomerPointService $customerPointService)
    {
    }

    public function index(Request $request)
    {
        $keyword = trim((string) $request->get('search', ''));
        $paymentMethod = trim((string) $request->get('payment_method', ''));

        $orders = Order::query()
            ->with(['items.product', 'customer', 'staff'])
            ->when($keyword !== '', function ($query) use ($keyword) {
                $query->where(function ($q) use ($keyword) {
                    $q->where('order_no', 'like', "%{$keyword}%")
                        ->orWhere('payment_method', 'like', "%{$keyword}%")
                        ->orWhereHas('customer', function ($cq) use ($keyword) {
                            $cq->where('name', 'like', "%{$keyword}%")
                                ->orWhere('phone', 'like', "%{$keyword}%");
                        });
                });
            })
            ->when($paymentMethod !== '', function ($query) use ($paymentMethod) {
                $query->where('payment_method', $paymentMethod);
            })
            ->latest()
            ->get()
            ->map(function ($order) {
                $paid = 0;

                if (in_array($order->payment_method, ['cash', 'card', 'bank_transfer'])) {
                    $paid = (float) $order->total;
                }

                if (!is_null($order->cash_received)) {
                    $paid = min((float) $order->cash_received, (float) $order->total);
                }

                $due = max((float) $order->total - $paid, 0);

                $status = 'unpaid';
                if ($paid >= (float) $order->total && (float) $order->total > 0) {
                    $status = 'paid';
                } elseif ($paid > 0 && $paid < (float) $order->total) {
                    $status = 'partial';
                }

                return [
                    'id' => (string) $order->id,
                    'invoice_code' => $order->order_no,
                    'customer_id' => $order->customer_id,
                    'customer_name' => $order->customer?->name ?? '',
                    'customer_phone' => $order->customer?->phone,
                    'staff_id' => $order->staff_id,
                    'staff_name' => $order->staff?->name,
                    'note' => $order->note,
                    'invoice_date' => optional($order->created_at)->toDateTimeString(),
                    'grand_total' => (float) $order->total,
                    'subtotal' => (float) $order->subtotal,
                    'discount' => (float) $order->discount,
                    'paid_amount' => $paid,
                    'due_amount' => $due,
                    'payment_method' => $order->payment_method,
                    'payment_status' => $status,
                    'cash_received' => (float) ($order->cash_received ?? 0),
                    'change_amount' => (float) ($order->change_amount ?? 0),
                    'items' => $order->items->map(function ($item) {
                        return [
                            'id' => (string) $item->id,
                            'product_id' => (string) $item->product_id,
                            'product_name' => $item->product?->name,
                            'sku' => $item->product?->sku,
                            'qty' => (int) $item->qty,
                            'price' => (float) $item->price,
                            'line_total' => (float) $item->line_total,
                            'note' => $item->note,
                        ];
                    })->values(),
                ];
            })
            ->values();

        return response()->json([
            'data' => $orders,
        ]);
    }

    public function show(string $id)
    {
        $order = Order::with(['items.product', 'customer', 'staff'])->findOrFail($id);

        $paid = 0;

        if (in_array($order->payment_method, ['cash', 'card', 'bank_transfer'])) {
            $paid = (float) $order->total;
        }

        if (!is_null($order->cash_received)) {
            $paid = min((float) $order->cash_received, (float) $order->total);
        }

        $due = max((float) $order->total - $paid, 0);

        $status = 'unpaid';
        if ($paid >= (float) $order->total && (float) $order->total > 0) {
            $status = 'paid';
        } elseif ($paid > 0 && $paid < (float) $order->total) {
            $status = 'partial';
        }

        return response()->json([
            'data' => [
                'id' => (string) $order->id,
                'invoice_code' => $order->order_no,
                'customer_id' => $order->customer_id,
                'customer_name' => $order->customer?->name ?? '',
                'customer_phone' => $order->customer?->phone,
                'staff_id' => $order->staff_id,
                'staff_name' => $order->staff?->name,
                'note' => $order->note,
                'invoice_date' => optional($order->created_at)->toDateTimeString(),
                'grand_total' => (float) $order->total,
                'subtotal' => (float) $order->subtotal,
                'discount' => (float) $order->discount,
                'paid_amount' => $paid,
                'due_amount' => $due,
                'payment_method' => $order->payment_method,
                'payment_status' => $status,
                'cash_received' => (float) ($order->cash_received ?? 0),
                'change_amount' => (float) ($order->change_amount ?? 0),
                'items' => $order->items->map(function ($item) {
                    return [
                        'id' => (string) $item->id,
                        'product_id' => (string) $item->product_id,
                        'product_name' => $item->product?->name ?? 'N/A',
                        'sku' => $item->product?->sku ?? 'N/A',
                        'qty' => (int) $item->qty,
                        'price' => (float) $item->price,
                        'line_total' => (float) $item->line_total,
                        'note' => $item->note,
                    ];
                })->values(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'customerId' => ['nullable', 'string', 'exists:customers,id'],
            'staffId' => ['nullable', 'exists:users,id'],
            'note' => ['nullable', 'string'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.productId' => ['required', 'string', 'exists:products,id'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
            'items.*.note' => ['nullable', 'string'],

            'discountCode' => ['nullable', 'string'],
            'paymentMethod' => ['nullable', 'string'],
            'payment.cashReceived' => ['nullable', 'numeric', 'min:0'],
            'payment.changeAmount' => ['nullable', 'numeric', 'min:0'],

            'totals.subtotal' => ['required', 'numeric', 'min:0'],
            'totals.discount' => ['required', 'numeric', 'min:0'],
            'totals.total' => ['required', 'numeric', 'min:0'],
        ]);

        $pointExchangeAmount = $this->customerPointService->getSpendAmountPerPoint();

        $result = DB::transaction(function () use ($data, $pointExchangeAmount) {
            $order = Order::create([
                'order_no' => 'ORD-' . now()->format('YmdHis'),
                'customer_id' => $data['customerId'] ?? null,
                'staff_id' => $data['staffId'] ?? null,
                'note' => $data['note'] ?? null,
                'subtotal' => $data['totals']['subtotal'],
                'discount' => $data['totals']['discount'],
                'total' => $data['totals']['total'],
                'discount_code' => $data['discountCode'] ?? null,
                'payment_method' => $data['paymentMethod'] ?? null,
                'cash_received' => data_get($data, 'payment.cashReceived'),
                'change_amount' => data_get($data, 'payment.changeAmount'),
            ]);

            foreach ($data['items'] as $item) {
                $qty = (int) $item['qty'];
                $price = (float) $item['price'];
                $lineTotal = $qty * $price;

                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $item['productId'],
                    'qty' => $qty,
                    'price' => $price,
                    'line_total' => $lineTotal,
                    'note' => $item['note'] ?? null,
                ]);

                $product = Product::findOrFail($item['productId']);
                $newQty = max(0, (int) $product->quantity - $qty);
                $product->quantity = $newQty;
                if ($newQty === 0) {
                    $product->publish = false;
                }
                $product->save();
            }

            $earnedPoints = 0;
            $customerPoints = null;

            if (!empty($data['customerId'])) {
                $customer = Customer::query()
                    ->lockForUpdate()
                    ->find($data['customerId']);

                if ($customer) {
                    $earnedPoints = $this->customerPointService->calculateEarnedPoints(
                        $data['totals']['total'],
                        $pointExchangeAmount
                    );

                    if ($earnedPoints > 0) {
                        $customer->loyalty_points = (int) ($customer->loyalty_points ?? 0) + $earnedPoints;
                        $customer->save();
                    }

                    $customerPoints = (int) ($customer->loyalty_points ?? 0);
                }
            }

            return [
                'order' => $order,
                'earned_points' => $earnedPoints,
                'customer_loyalty_points' => $customerPoints,
            ];
        });

        /** @var \App\Models\Order $order */
        $order = $result['order'];

        return response()->json([
            'data' => [
                'id' => (string) $order->id,
                'order_no' => $order->order_no,
                'earned_points' => (int) ($result['earned_points'] ?? 0),
                'customer_loyalty_points' => $result['customer_loyalty_points'],
                'point_exchange_amount' => $pointExchangeAmount,
            ],
        ], 201);
    }
}
