<?php

namespace Database\Seeders;

use App\Models\ContentField;
use App\Models\ContentStructure;
use Illuminate\Database\Seeder;

class ContentStructureSeeder extends Seeder
{
    public function run(): void
    {
        $productStructure = ContentStructure::firstOrCreate(
            ['slug' => 'product'],
            ['name' => 'San pham', 'slug' => 'product']
        );

        $productDefaults = [
            [
                'name' => 'Thuong hieu',
                'slug' => 'brand',
                'type' => 'single_line',
                'required' => false,
                'description' => null,
                'options' => null,
                'sort_order' => 2,
            ],
            [
                'name' => 'Mau sac',
                'slug' => 'color',
                'type' => 'single_choice',
                'required' => false,
                'description' => null,
                'options' => ['Do', 'Xanh', 'Den', 'Trang', 'Vang'],
                'sort_order' => 3,
            ],
            [
                'name' => 'Kich thuoc',
                'slug' => 'size',
                'type' => 'single_line',
                'required' => false,
                'description' => null,
                'options' => null,
                'sort_order' => 4,
            ],
            [
                'name' => 'Chat lieu',
                'slug' => 'material',
                'type' => 'single_line',
                'required' => false,
                'description' => null,
                'options' => null,
                'sort_order' => 5,
            ],
            [
                'name' => 'Mo ta chi tiet',
                'slug' => 'detail',
                'type' => 'multi_line',
                'required' => false,
                'description' => null,
                'options' => null,
                'sort_order' => 6,
            ],
            [
                'name' => 'Noi bat',
                'slug' => 'featured',
                'type' => 'checkbox',
                'required' => false,
                'description' => null,
                'options' => null,
                'sort_order' => 7,
            ],
        ];

        foreach ($productDefaults as $row) {
            ContentField::updateOrCreate(
                [
                    'content_structure_id' => $productStructure->id,
                    'slug' => $row['slug'],
                ],
                array_merge($row, [
                    'content_structure_id' => $productStructure->id,
                ])
            );
        }
    }
}
