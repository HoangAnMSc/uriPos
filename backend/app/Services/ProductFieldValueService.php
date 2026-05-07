<?php

namespace App\Services;

use App\Models\ContentField;
use App\Models\Product;
use App\Models\ProductFieldValue;

class ProductFieldValueService
{
    public function sync(Product $product, array $fieldValues = []): void
    {
        $structureId = $product->content_structure_id;

        if (!$structureId) {
            ProductFieldValue::where('product_id', $product->id)->delete();
            return;
        }

        $fields = ContentField::where('content_structure_id', $structureId)->get();

        $validFieldIds = [];

        foreach ($fields as $field) {
            $value = $fieldValues[$field->slug] ?? null;

            $row = ProductFieldValue::updateOrCreate(
                [
                    'product_id' => $product->id,
                    'content_field_id' => $field->id,
                ],
                [
                    'value' => $this->normalizeValue($field->type, $value),
                ]
            );

            $validFieldIds[] = $row->content_field_id;
        }

        ProductFieldValue::where('product_id', $product->id)
            ->whereNotIn('content_field_id', $validFieldIds)
            ->delete();
    }

    public function getMappedValues(Product $product): array
    {
        $product->loadMissing('fieldValues.contentField');

        $result = [];

        foreach ($product->fieldValues as $item) {
            if ($item->contentField) {
                $result[$item->contentField->slug] = $item->value;
            }
        }

        return $result;
    }

    protected function normalizeValue(?string $type, $value)
    {
        if (is_array($value)) {
            return json_encode($value, JSON_UNESCAPED_UNICODE);
        }

        if ($type === 'checkbox') {
            return $value ? '1' : '0';
        }

        return $value === '' ? null : $value;
    }
}