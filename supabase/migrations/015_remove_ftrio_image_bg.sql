-- fit_product_trio 이미지 배경색 제거
UPDATE section_templates
SET css_template = '.s-ftrio, .s-ftrio * { box-sizing: border-box; }
.s-ftrio {
  width: 860px;
  padding: 48px 40px;
}
.s-ftrio__grid {
  display: flex;
  gap: 24px;
}
.s-ftrio__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
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
