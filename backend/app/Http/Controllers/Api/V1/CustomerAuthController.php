<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\CustomerRankService;
use Illuminate\Http\Request;

class CustomerAuthController extends Controller
{
    public function __construct(private CustomerRankService $customerRankService)
    {
    }

    public function login(Request $request)
    {
        $request->merge([
            'phone' => preg_replace('/\D+/', '', (string) $request->input('phone', '')),
        ]);

        $validated = $request->validate([
            'phone' => ['required', 'regex:/^[0-9]{10}$/'],
        ]);

        $customer = Customer::where('phone', $validated['phone'])->first();

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Số điện thoại chưa được đăng ký',
            ], 404);
        }

        $token = $customer->createToken('customer_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'customer' => $this->formatCustomer($customer),
            'token' => $token,
        ]);
    }

    public function register(Request $request)
    {
        $request->merge([
            'phone' => preg_replace('/\D+/', '', (string) $request->input('phone', '')),
        ]);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => ['required', 'regex:/^[0-9]{10}$/', 'unique:customers,phone'],
        ]);

        $customer = Customer::create([
            'name' => $validated['name'],
            'phone' => $validated['phone'],
        ]);

        $token = $customer->createToken('customer_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'customer' => $this->formatCustomer($customer),
            'token' => $token,
        ], 201);
    }

    public function me(Request $request)
    {
        $customer = $request->user();

        return response()->json([
            'success' => true,
            'customer' => $this->formatCustomer($customer),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out',
        ]);
    }

    private function formatCustomer(Customer $customer): array
    {
        return [
            'id' => $customer->id,
            'name' => $customer->name,
            'phone' => $customer->phone,
            'address' => $customer->address,
            'loyalty_points' => (int) ($customer->loyalty_points ?? 0),
            'rank' => $this->customerRankService->resolveRankName((int) ($customer->loyalty_points ?? 0)),
        ];
    }
}
