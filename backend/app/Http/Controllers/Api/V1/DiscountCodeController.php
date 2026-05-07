<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DiscountCode;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DiscountCodeController extends Controller
{
  public function index() {
    return DiscountCode::orderBy('code')->get();
  }

  public function store(Request $request) {
    $data = $request->validate([
      'code' => ['required','string','max:80', Rule::unique('discount_codes','code')],
      'type' => ['required', Rule::in(['percent','fixed'])],
      'value' => ['required','numeric','min:0'],
      'minSubtotal' => ['nullable','numeric','min:0'],
      'maxDiscount' => ['nullable','numeric','min:0'],
      'active' => ['nullable','boolean'],
    ]);

    $code = strtoupper(trim($data['code']));
    $type = $data['type'];

    if ($type === 'percent' && $data['value'] > 100) {
      return response()->json(['message' => 'Percent must be <= 100'], 422);
    }

    $d = DiscountCode::create([
      'code' => $code,
      'type' => $type,
      'value' => $data['value'],
      'min_subtotal' => $data['minSubtotal'] ?? 0,
      'max_discount' => $data['maxDiscount'] ?? null,
      'active' => array_key_exists('active',$data) ? (bool)$data['active'] : true,
    ]);

    return response()->json($d, 201);
  }

  public function update(Request $request, $id)
  {
    $d = DiscountCode::findOrFail($id);

    $data = $request->validate([
      'code' => ['sometimes','string'],
      'type' => ['sometimes','in:percent,fixed'],
      'value' => ['sometimes','numeric','min:0'],
      'minSubtotal' => ['sometimes','numeric','min:0'],
      'maxDiscount' => ['nullable','numeric','min:0'],
      'active' => ['sometimes'],
    ]);

    if (array_key_exists('active', $data)) {
      $d->active = filter_var($data['active'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
      if ($d->active === null) {
        $d->active = (int) $data['active'] === 1;
      }
    }

    if (array_key_exists('minSubtotal', $data)) $d->min_subtotal = $data['minSubtotal'];
    if (array_key_exists('maxDiscount', $data)) $d->max_discount = $data['maxDiscount'];
    if (array_key_exists('code', $data)) $d->code = strtoupper(trim($data['code']));
    if (array_key_exists('type', $data)) $d->type = $data['type'];
    if (array_key_exists('value', $data)) $d->value = $data['value'];

    $d->save();

    return response()->json($d);
  }

  public function destroy($id)
  {
    $d = DiscountCode::findOrFail($id);
    $d->delete();
    return response()->json(['success' => true]);
  }
}