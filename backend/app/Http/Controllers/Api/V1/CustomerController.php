<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Customer;
use App\Services\CustomerPointService;
use App\Services\CustomerRankService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    public function __construct(
        private CustomerRankService $customerRankService,
        private CustomerPointService $customerPointService
    ) {
    }

    public function index(Request $request)
    {
        $query = Customer::query()
            ->orderBy('created_at', 'asc');

        $keyword = trim($request->q ?? $request->keyword ?? '');

        if ($keyword !== '') {
            $query->where(function ($q) use ($keyword) {
                $q->where('name', 'like', "%{$keyword}%")
                    ->orWhere('phone', 'like', "%{$keyword}%");
            });
        }

        $customers = $query->paginate($request->integer('per_page', 10));
        $rankRules = $this->customerRankService->getRules();

        $customers->setCollection(
            $customers->getCollection()->map(
                fn (Customer $customer) => $this->transformCustomer($customer, $rankRules)
            )
        );

        return response()->json([
            'data' => $customers,
        ]);
    }

    public function store(Request $request)
    {
        $request->merge([
            'phone' => preg_replace('/\D+/', '', (string) $request->input('phone', '')),
        ]);

        $payload = $request->validate([
            'name' => ['required', 'string', 'max:190'],
            'phone' => ['required', 'regex:/^[0-9]{10}$/', 'unique:customers,phone'],
            'address' => ['nullable', 'string', 'max:1000'],
            'loyalty_points' => ['nullable', 'integer', 'min:0'],
        ]);

        $customer = Customer::create([
            'name' => trim($payload['name']),
            'phone' => $payload['phone'],
            'address' => trim((string) ($payload['address'] ?? '')) ?: null,
            'loyalty_points' => (int) ($payload['loyalty_points'] ?? 0),
        ]);

        return response()->json([
            'data' => $this->transformCustomer($customer),
        ], 201);
    }

    public function show($id)
    {
        $customer = Customer::query()->findOrFail($id);

        return response()->json([
            'data' => $this->transformCustomer($customer),
        ]);
    }

    public function update(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);

        if ($request->exists('phone')) {
            $request->merge([
                'phone' => preg_replace('/\D+/', '', (string) $request->input('phone', '')),
            ]);
        }

        $payload = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:190'],
            'phone' => [
                'sometimes',
                'required',
                'regex:/^[0-9]{10}$/',
                Rule::unique('customers', 'phone')->ignore($customer->id),
            ],
            'address' => ['nullable', 'string', 'max:1000'],
            'loyalty_points' => ['nullable', 'integer', 'min:0'],
        ]);

        $customer->update([
            'name' => array_key_exists('name', $payload) ? trim($payload['name']) : $customer->name,
            'phone' => $payload['phone'] ?? $customer->phone,
            'address' => array_key_exists('address', $payload)
                ? (trim((string) ($payload['address'] ?? '')) ?: null)
                : $customer->address,
            'loyalty_points' => array_key_exists('loyalty_points', $payload)
                ? (int) ($payload['loyalty_points'] ?? 0)
                : (int) $customer->loyalty_points,
        ]);

        return response()->json([
            'data' => $this->transformCustomer($customer->fresh()),
        ]);
    }

    public function destroy($id)
    {
        $customer = Customer::findOrFail($id);
        $customer->delete();

        return response()->json([
            'message' => 'Deleted',
        ]);
    }

    public function rankSettings()
    {
        return response()->json([
            'data' => [
                'rules' => $this->customerRankService->getRules(),
                'point_exchange_amount' => $this->customerPointService->getSpendAmountPerPoint(),
            ],
        ]);
    }

    public function updateRankSettings(Request $request)
    {
        $payload = $request->validate([
            'rules' => ['required', 'array', 'min:1'],
            'rules.*.name' => ['required', 'string', 'max:190'],
            'rules.*.min_points' => ['required', 'integer', 'min:0'],
        ]);

        $hasZeroThreshold = collect($payload['rules'])->contains(
            fn (array $rule) => (int) ($rule['min_points'] ?? -1) === 0
        );

        if (!$hasZeroThreshold) {
            return response()->json([
                'message' => 'Can co it nhat mot hang bat dau tu 0 diem.',
                'errors' => [
                    'rules' => ['Can co it nhat mot hang bat dau tu 0 diem.'],
                ],
            ], 422);
        }

        $rules = $this->customerRankService->normalizeRules($payload['rules']);
        $points = array_column($rules, 'min_points');

        if (count($points) !== count(array_unique($points))) {
            return response()->json([
                'message' => 'Moi moc diem phai la duy nhat.',
                'errors' => [
                    'rules' => ['Moi moc diem phai la duy nhat.'],
                ],
            ], 422);
        }

        if (($rules[0]['min_points'] ?? null) !== 0) {
            return response()->json([
                'message' => 'Moc diem dau tien phai bat dau tu 0.',
                'errors' => [
                    'rules' => ['Moc diem dau tien phai bat dau tu 0.'],
                ],
            ], 422);
        }

        $settings = AppSetting::firstOrCreateSettings();
        $settings->update([
            'customer_rank_rules' => $rules,
        ]);

        return response()->json([
            'data' => [
                'rules' => $this->customerRankService->getRules(),
                'point_exchange_amount' => $this->customerPointService->getSpendAmountPerPoint(),
            ],
        ]);
    }

    public function updatePointSettings(Request $request)
    {
        $payload = $request->validate([
            'point_exchange_amount' => ['required', 'integer', 'min:1'],
        ]);

        $amount = $this->customerPointService->normalizeSpendAmountPerPoint(
            $payload['point_exchange_amount']
        );

        $settings = AppSetting::firstOrCreateSettings();
        $settings->update([
            'customer_point_exchange_amount' => $amount,
        ]);

        return response()->json([
            'data' => [
                'point_exchange_amount' => $this->customerPointService->getSpendAmountPerPoint(),
            ],
        ]);
    }

    private function transformCustomer(Customer $customer, ?array $rankRules = null): array
    {
        $points = (int) ($customer->loyalty_points ?? 0);
        $data = $customer->toArray();
        $data['rank'] = $this->customerRankService->resolveRankName($points, $rankRules);
        $data['loyalty_points'] = $points;

        return $data;
    }
}
