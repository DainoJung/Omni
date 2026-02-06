-- fit_product_trio: 빈 상품 슬롯 숨기기 (상품 개수가 3의 배수가 아닐 때)
UPDATE section_templates
SET
  html_template = '<div class="s-ftrio" style="background-color: {{bg_color}};">
  <div class="s-ftrio__grid">
    <div class="s-ftrio__item" data-has-product="{{product_image_0}}">
      <img class="s-ftrio__image" src="{{product_image_0}}" data-placeholder="product_image_0" />
      <div class="s-ftrio__info">
        <div class="s-ftrio__name" data-placeholder="product_name_0" data-editable="true">{{product_name_0}}</div>
        <div class="s-ftrio__desc" data-placeholder="product_desc_0" data-editable="true">{{product_desc_0}}</div>
        <div class="s-ftrio__price" data-placeholder="product_price_0" data-editable="true">{{product_price_0}}</div>
      </div>
    </div>
    <div class="s-ftrio__item" data-has-product="{{product_image_1}}">
      <img class="s-ftrio__image" src="{{product_image_1}}" data-placeholder="product_image_1" />
      <div class="s-ftrio__info">
        <div class="s-ftrio__name" data-placeholder="product_name_1" data-editable="true">{{product_name_1}}</div>
        <div class="s-ftrio__desc" data-placeholder="product_desc_1" data-editable="true">{{product_desc_1}}</div>
        <div class="s-ftrio__price" data-placeholder="product_price_1" data-editable="true">{{product_price_1}}</div>
      </div>
    </div>
    <div class="s-ftrio__item" data-has-product="{{product_image_2}}">
      <img class="s-ftrio__image" src="{{product_image_2}}" data-placeholder="product_image_2" />
      <div class="s-ftrio__info">
        <div class="s-ftrio__name" data-placeholder="product_name_2" data-editable="true">{{product_name_2}}</div>
        <div class="s-ftrio__desc" data-placeholder="product_desc_2" data-editable="true">{{product_desc_2}}</div>
        <div class="s-ftrio__price" data-placeholder="product_price_2" data-editable="true">{{product_price_2}}</div>
      </div>
    </div>
  </div>
</div>',
  css_template = '.s-ftrio, .s-ftrio * { box-sizing: border-box; }
.s-ftrio {
  width: 860px;
  padding: 48px 40px;
}
.s-ftrio__grid {
  display: flex;
  gap: 24px;
  justify-content: center;
}
.s-ftrio__item {
  flex: 1;
  max-width: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.s-ftrio__item[data-has-product=""] {
  display: none;
}
.s-ftrio__image {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  border-radius: 8px;
}
.s-ftrio__info {
  width: 100%;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.s-ftrio__name {
  color: #FFFFFF;
  font-family: "Pretendard", sans-serif;
  font-weight: 600;
  font-size: 24px;
  line-height: 140%;
}
.s-ftrio__desc {
  color: rgba(255,255,255,0.7);
  font-family: "Pretendard", sans-serif;
  font-weight: 400;
  font-size: 20px;
  line-height: 150%;
  margin-top: 8px;
}
.s-ftrio__price {
  color: #FFFFFF;
  font-family: "Pretendard", sans-serif;
  font-weight: 800;
  font-size: 28px;
  line-height: 130%;
  margin-top: 12px;
}'
WHERE section_type = 'fit_product_trio';
