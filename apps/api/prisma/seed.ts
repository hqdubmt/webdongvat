import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const speciesData = [
  {
    slug: 'vooc-cha-va-chan-do',
    name: 'Voọc Chà Vá Chân Đỏ',
    scientificName: 'Pygathrix nemaeus',
    description:
      'Voọc chà vá chân đỏ là một trong những loài linh trưởng đẹp nhất thế giới, được mệnh danh là "nữ hoàng của các loài linh trưởng". Chúng có bộ lông nhiều màu sắc rực rỡ với các mảng đỏ, xám và trắng đặc trưng. Loài này sinh sống trong rừng nhiệt đới ở miền Trung Việt Nam và Lào.',
    conservationStatus: 'Nguy cấp (EN)',
    images: [{ objectKey: 'seed/vooc-cha-va-chan-do', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Red-shanked_douc_langur_%28Pygathrix_nemaeus%29_female_and_juvenile_Son_Tra.jpg/960px-Red-shanked_douc_langur_%28Pygathrix_nemaeus%29_female_and_juvenile_Son_Tra.jpg', caption: 'Voọc Chà Vá Chân Đỏ tại Sơn Trà', isPrimary: true }],
    locations: [
      { latitude: 15.8801, longitude: 108.338, placeName: 'Khu bảo tồn thiên nhiên Sơn Trà, Đà Nẵng' },
      { latitude: 15.3, longitude: 108.0, placeName: 'Vườn quốc gia Bạch Mã, Thừa Thiên Huế' },
      { latitude: 14.8, longitude: 108.3, placeName: 'Khu bảo tồn thiên nhiên Kon Ka Kinh, Gia Lai' },
    ],
  },
  {
    slug: 'sao-la',
    name: 'Sao La',
    scientificName: 'Pseudoryx nghetinhensis',
    description:
      'Sao la hay còn gọi là kỳ lân châu Á, là một trong những loài thú lớn hiếm nhất thế giới. Được phát hiện lần đầu vào năm 1992 tại Việt Nam, sao la là loài đặc hữu của dãy Trường Sơn. Chúng có hai chiếc sừng dài, thẳng và đặc điểm nhận dạng riêng biệt trên khuôn mặt.',
    conservationStatus: 'Cực kỳ nguy cấp (CR)',
    images: [{ objectKey: 'seed/sao-la', url: 'https://upload.wikimedia.org/wikipedia/commons/7/73/Pseudoryx_nghetinhensis%2C_b.PNG', caption: 'Sao La - loài thú hiếm nhất thế giới', isPrimary: true }],
    locations: [
      { latitude: 18.3, longitude: 105.5, placeName: 'Khu bảo tồn thiên nhiên Vũ Quang, Hà Tĩnh' },
      { latitude: 16.0, longitude: 107.0, placeName: 'Vườn quốc gia Bạch Mã, Thừa Thiên Huế' },
      { latitude: 19.8, longitude: 104.7, placeName: 'Khu bảo tồn thiên nhiên Pù Hoạt, Nghệ An' },
    ],
  },
  {
    slug: 'ho-dong-duong',
    name: 'Hổ Đông Dương',
    scientificName: 'Panthera tigris corbetti',
    description:
      'Hổ Đông Dương là phân loài hổ sinh sống ở khu vực Đông Nam Á, bao gồm Việt Nam, Lào, Campuchia, Thái Lan và Myanmar. Chúng nhỏ hơn hổ Bengal và có bộ lông sẫm màu hơn với các sọc rõ ràng hơn. Hổ là biểu tượng văn hóa quan trọng của nhiều quốc gia trong khu vực.',
    conservationStatus: 'Nguy cấp (EN)',
    images: [{ objectKey: 'seed/ho-dong-duong', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Panthera_tigris_corbetti_01.jpg/960px-Panthera_tigris_corbetti_01.jpg', caption: 'Hổ Đông Dương', isPrimary: true }],
    locations: [
      { latitude: 12.0, longitude: 107.8, placeName: 'Vườn quốc gia Cát Tiên, Đồng Nai' },
      { latitude: 15.5, longitude: 107.5, placeName: 'Khu bảo tồn thiên nhiên Ngọc Linh, Kon Tum' },
      { latitude: 22.3, longitude: 104.0, placeName: 'Khu bảo tồn thiên nhiên Hoàng Liên Sơn, Lào Cai' },
    ],
  },
  {
    slug: 'voi-chau-a',
    name: 'Voi Châu Á',
    scientificName: 'Elephas maximus',
    description:
      'Voi châu Á là loài voi lớn nhất châu Á và là loài vật biểu tượng của nhiều nền văn hóa Đông Nam Á. Chúng nhỏ hơn voi châu Phi và có tai nhỏ hơn. Voi châu Á sống trong các khu rừng nhiệt đới và cận nhiệt đới, thường thành đàn từ 6-7 con.',
    conservationStatus: 'Nguy cấp (EN)',
    images: [{ objectKey: 'seed/voi-chau-a', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Elephas_maximus_%28Bandipur%29.jpg/960px-Elephas_maximus_%28Bandipur%29.jpg', caption: 'Voi Châu Á tại Bandipur', isPrimary: true }],
    locations: [
      { latitude: 12.1, longitude: 107.7, placeName: 'Vườn quốc gia Cát Tiên, Đồng Nai' },
      { latitude: 14.0, longitude: 108.0, placeName: 'Vườn quốc gia Kon Ka Kinh, Gia Lai' },
      { latitude: 13.0, longitude: 107.5, placeName: 'Vườn quốc gia Chư Mom Ray, Kon Tum' },
    ],
  },
  {
    slug: 'gau-cho',
    name: 'Gấu Chó',
    scientificName: 'Helarctos malayanus',
    description:
      'Gấu chó hay gấu mật là loài gấu nhỏ nhất thế giới, sinh sống ở rừng nhiệt đới Đông Nam Á. Chúng có bộ lông đen ngắn với một mảng lông vàng hay trắng ở ngực. Gấu chó là loài leo trèo giỏi và thường dành phần lớn thời gian trên cây.',
    conservationStatus: 'Sẽ nguy cấp (VU)',
    images: [{ objectKey: 'seed/gau-cho', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Sun-bear.jpg/960px-Sun-bear.jpg', caption: 'Gấu Chó', isPrimary: true }],
    locations: [
      { latitude: 12.0, longitude: 107.8, placeName: 'Vườn quốc gia Cát Tiên, Đồng Nai' },
      { latitude: 22.5, longitude: 103.8, placeName: 'Khu bảo tồn thiên nhiên Mường Nhé, Điện Biên' },
      { latitude: 10.4, longitude: 107.2, placeName: 'Khu bảo tồn thiên nhiên Bình Châu-Phước Bửu, Bà Rịa-Vũng Tàu' },
    ],
  },
  {
    slug: 'te-giac-java',
    name: 'Tê Giác Java',
    scientificName: 'Rhinoceros sondaicus',
    description:
      'Tê giác Java là một trong những loài thú lớn hiếm nhất thế giới. Tại Việt Nam, quần thể tê giác Java cuối cùng đã tuyệt chủng vào năm 2010 tại Vườn quốc gia Cát Tiên. Hiện nay chỉ còn quần thể ở Vườn quốc gia Ujung Kulon, Indonesia.',
    conservationStatus: 'Cực kỳ nguy cấp (CR)',
    images: [{ objectKey: 'seed/te-giac-java', url: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Rhinoceros_sondaicus_in_London_Zoo.jpg', caption: 'Tê Giác Java tại vườn thú London', isPrimary: true }],
    locations: [
      { latitude: 11.5, longitude: 107.4, placeName: 'Vườn quốc gia Cát Tiên (tuyệt chủng cục bộ), Đồng Nai' },
    ],
  },
  {
    slug: 'ca-sau-nuoc-ngot',
    name: 'Cá Sấu Nước Ngọt',
    scientificName: 'Crocodylus siamensis',
    description:
      'Cá sấu Xiêm hay cá sấu nước ngọt là loài cá sấu cỡ vừa, sinh sống ở các vùng nước ngọt của Đông Nam Á. Loài này đã gần như biến mất khỏi phần lớn vùng phân bố tự nhiên do săn bắt quá mức và mất môi trường sống.',
    conservationStatus: 'Cực kỳ nguy cấp (CR)',
    images: [{ objectKey: 'seed/ca-sau-nuoc-ngot', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Crocodylus_siamensis_in_moscow_zoo_01.jpg/960px-Crocodylus_siamensis_in_moscow_zoo_01.jpg', caption: 'Cá Sấu Xiêm', isPrimary: true }],
    locations: [
      { latitude: 12.0, longitude: 107.8, placeName: 'Vườn quốc gia Cát Tiên, Đồng Nai' },
      { latitude: 11.8, longitude: 105.1, placeName: 'Khu Ramsar Bàu Sấu, Đồng Nai' },
    ],
  },
  {
    slug: 'cu-long-dau-do',
    name: 'Cú Lông Đầu Đỏ',
    scientificName: 'Ninox rufa',
    description:
      'Cú lông đầu đỏ là một loài chim săn mồi ban đêm thuộc họ Cú mèo. Loài này có kích thước lớn với đặc điểm nhận dạng là bộ lông nâu đỏ và đôi mắt vàng lớn. Chúng săn các loài động vật nhỏ như chuột, thằn lằn và côn trùng lớn.',
    conservationStatus: 'Ít lo ngại (LC)',
    images: [{ objectKey: 'seed/cu-long-dau-do', url: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Ninox_rufa_1.jpg', caption: 'Cú Lông Đầu Đỏ', isPrimary: true }],
    locations: [
      { latitude: 16.5, longitude: 107.6, placeName: 'Vườn quốc gia Bạch Mã, Thừa Thiên Huế' },
      { latitude: 14.3, longitude: 108.5, placeName: 'Khu bảo tồn thiên nhiên An Toàn, Bình Định' },
    ],
  },
  {
    slug: 'ran-ho-mang-chua',
    name: 'Rắn Hổ Mang Chúa',
    scientificName: 'Ophiophagus hannah',
    description:
      'Rắn hổ mang chúa là loài rắn độc dài nhất thế giới, có thể đạt chiều dài lên đến 5,85 mét. Chúng có thể đứng thẳng và nhìn thẳng vào mắt người trưởng thành. Nọc độc của chúng đủ mạnh để giết chết một con voi.',
    conservationStatus: 'Sẽ nguy cấp (VU)',
    images: [{ objectKey: 'seed/ran-ho-mang-chua', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/12_-_The_Mystical_King_Cobra_and_Coffee_Forests.jpg/960px-12_-_The_Mystical_King_Cobra_and_Coffee_Forests.jpg', caption: 'Rắn Hổ Mang Chúa', isPrimary: true }],
    locations: [
      { latitude: 21.8, longitude: 104.5, placeName: 'Khu bảo tồn thiên nhiên Tây Côn Lĩnh, Hà Giang' },
      { latitude: 12.0, longitude: 107.8, placeName: 'Vườn quốc gia Cát Tiên, Đồng Nai' },
      { latitude: 16.0, longitude: 108.2, placeName: 'Khu bảo tồn thiên nhiên Sơn Trà, Đà Nẵng' },
    ],
  },
  {
    slug: 'dugong',
    name: 'Bò Biển (Dugong)',
    scientificName: 'Dugong dugon',
    description:
      'Dugong hay bò biển là loài động vật biển thuộc bộ Sirenia. Chúng là loài ăn cỏ biển và có thể sống đến 70 năm. Dugong là họ hàng gần của voi và là nguồn cảm hứng cho truyền thuyết về người cá.',
    conservationStatus: 'Sẽ nguy cấp (VU)',
    images: [{ objectKey: 'seed/dugong', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Dugong.JPG/960px-Dugong.JPG', caption: 'Dugong bơi trong nước', isPrimary: true }],
    locations: [
      { latitude: 10.2, longitude: 103.9, placeName: 'Vườn quốc gia Phú Quốc, Kiên Giang' },
      { latitude: 8.7, longitude: 106.6, placeName: 'Vườn quốc gia Côn Đảo, Bà Rịa-Vũng Tàu' },
    ],
  },
  {
    slug: 'rua-bien-xanh',
    name: 'Rùa Biển Xanh',
    scientificName: 'Chelonia mydas',
    description:
      'Rùa biển xanh là một trong những loài rùa biển lớn nhất, có thể nặng đến 300 kg. Chúng nổi tiếng với khả năng định hướng và di cư hàng ngàn kilômét để quay về bãi biển nơi chúng được sinh ra để đẻ trứng.',
    conservationStatus: 'Nguy cấp (EN)',
    images: [{ objectKey: 'seed/rua-bien-xanh', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Green_sea_turtle_%28Chelonia_mydas%29_Moorea.jpg/960px-Green_sea_turtle_%28Chelonia_mydas%29_Moorea.jpg', caption: 'Rùa Biển Xanh', isPrimary: true }],
    locations: [
      { latitude: 11.9, longitude: 109.1, placeName: 'Vườn quốc gia Núi Chúa, Ninh Thuận' },
      { latitude: 8.7, longitude: 106.6, placeName: 'Vườn quốc gia Côn Đảo, Bà Rịa-Vũng Tàu' },
      { latitude: 15.9, longitude: 108.2, placeName: 'Bãi biển Cù Lao Chàm, Quảng Nam' },
    ],
  },
  {
    slug: 'ca-voi-xanh',
    name: 'Cá Voi Xanh',
    scientificName: 'Balaenoptera musculus',
    description:
      'Cá voi xanh là loài động vật lớn nhất từng tồn tại trên Trái Đất, có thể đạt chiều dài 33 mét và cân nặng 150-170 tấn. Chúng phát ra âm thanh có thể nghe thấy từ cách hàng trăm kilômét.',
    conservationStatus: 'Nguy cấp (EN)',
    images: [{ objectKey: 'seed/ca-voi-xanh', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Anim1754_-_Flickr_-_NOAA_Photo_Library.jpg/960px-Anim1754_-_Flickr_-_NOAA_Photo_Library.jpg', caption: 'Cá Voi Xanh', isPrimary: true }],
    locations: [
      { latitude: 15.0, longitude: 112.0, placeName: 'Vùng biển ngoài khơi Đà Nẵng' },
      { latitude: 10.0, longitude: 110.0, placeName: 'Vùng biển ngoài khơi Khánh Hòa' },
    ],
  },
  {
    slug: 'khi-voc-den-ma-trang',
    name: 'Vượn Đen Má Trắng',
    scientificName: 'Nomascus leucogenys',
    description:
      'Vượn đen má trắng là loài vượn đặc hữu của Việt Nam và Lào. Chúng nổi tiếng với tiếng hót du dương có thể vang vọng trong rừng. Con đực có bộ lông đen tuyền với mảng trắng ở má, trong khi con cái có màu vàng nâu.',
    conservationStatus: 'Cực kỳ nguy cấp (CR)',
    images: [{ objectKey: 'seed/khi-voc-den-ma-trang', url: 'https://upload.wikimedia.org/wikipedia/commons/8/85/Witwanggibbon_M.jpg', caption: 'Vượn Đen Má Trắng', isPrimary: true }],
    locations: [
      { latitude: 21.0, longitude: 104.8, placeName: 'Vườn quốc gia Xuân Sơn, Phú Thọ' },
      { latitude: 22.2, longitude: 104.2, placeName: 'Khu bảo tồn thiên nhiên Nà Hẩu, Yên Bái' },
      { latitude: 20.8, longitude: 104.5, placeName: 'Vườn quốc gia Ba Vì, Hà Nội' },
    ],
  },
  {
    slug: 'cu-lac-da',
    name: 'Culi Lớn',
    scientificName: 'Nycticebus bengalensis',
    description:
      'Culi lớn hay culi Bengal là một loài linh trưởng nhỏ sinh hoạt ban đêm. Chúng có đôi mắt to tròn thích nghi với việc nhìn trong đêm tối. Đặc biệt, culi lớn là một trong số ít loài linh trưởng có nọc độc.',
    conservationStatus: 'Nguy cấp (EN)',
    images: [{ objectKey: 'seed/cu-lac-da', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Captive_N._bengalensis_from_Laos_with_6-week_baby.JPG/960px-Captive_N._bengalensis_from_Laos_with_6-week_baby.JPG', caption: 'Culi Lớn và con', isPrimary: true }],
    locations: [
      { latitude: 21.5, longitude: 105.2, placeName: 'Vườn quốc gia Tam Đảo, Vĩnh Phúc' },
      { latitude: 20.4, longitude: 105.0, placeName: 'Khu bảo tồn thiên nhiên Hang Kia-Pà Cò, Hòa Bình' },
    ],
  },
  {
    slug: 'cu-rua-khong-lo',
    name: 'Rùa Hồ Gươm (Rùa Hoàn Kiếm)',
    scientificName: 'Rafetus swinhoei',
    description:
      'Rùa Hoàn Kiếm hay rùa Yangtze khổng lồ là một trong những loài rùa hiếm nhất và lớn nhất thế giới. Trong truyền thuyết Việt Nam, rùa Hồ Gươm là biểu tượng thiêng liêng gắn với sự tích Hồ Gươm.',
    conservationStatus: 'Cực kỳ nguy cấp (CR)',
    images: [{ objectKey: 'seed/cu-rua-khong-lo', url: 'https://upload.wikimedia.org/wikipedia/commons/d/d8/R%C3%B9a_%C4%90%E1%BB%93ng_M%C3%B4.jpg', caption: 'Rùa Hồ Gươm tại Đồng Mô', isPrimary: true }],
    locations: [
      { latitude: 21.0285, longitude: 105.852, placeName: 'Hồ Hoàn Kiếm, Hà Nội' },
      { latitude: 21.1, longitude: 105.7, placeName: 'Hồ Đồng Mô, Hà Nội' },
    ],
  },
  {
    slug: 'ca-map-rau',
    name: 'Cá Mập Voi',
    scientificName: 'Rhincodon typus',
    description:
      'Cá mập voi là loài cá lớn nhất thế giới, có thể đạt chiều dài 12-18 mét. Mặc dù kích thước khổng lồ, chúng hoàn toàn vô hại với con người và chỉ ăn sinh vật phù du, cá nhỏ và mực.',
    conservationStatus: 'Nguy cấp (EN)',
    images: [{ objectKey: 'seed/ca-map-rau', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Similan_Dive_Center_-_great_whale_shark.jpg/960px-Similan_Dive_Center_-_great_whale_shark.jpg', caption: 'Cá Mập Voi', isPrimary: true }],
    locations: [
      { latitude: 11.5, longitude: 109.5, placeName: 'Vùng biển Nha Trang, Khánh Hòa' },
      { latitude: 10.3, longitude: 104.0, placeName: 'Vùng biển Phú Quốc, Kiên Giang' },
    ],
  },
  {
    slug: 'gau-ngua',
    name: 'Gấu Ngựa',
    scientificName: 'Ursus thibetanus',
    description:
      'Gấu ngựa hay gấu đen châu Á là một loài gấu cỡ trung bình với bộ lông đen và mảng trắng hoặc kem ở ngực hình chữ V. Chúng sống trong rừng á nhiệt đới và ôn đới ở châu Á.',
    conservationStatus: 'Sẽ nguy cấp (VU)',
    images: [{ objectKey: 'seed/gau-ngua', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Ursus_thibetanus_3_%28Wroclaw_zoo%29.JPG/960px-Ursus_thibetanus_3_%28Wroclaw_zoo%29.JPG', caption: 'Gấu Ngựa châu Á', isPrimary: true }],
    locations: [
      { latitude: 22.8, longitude: 103.5, placeName: 'Vườn quốc gia Hoàng Liên, Lào Cai' },
      { latitude: 21.5, longitude: 105.2, placeName: 'Vườn quốc gia Tam Đảo, Vĩnh Phúc' },
      { latitude: 20.0, longitude: 104.3, placeName: 'Khu bảo tồn thiên nhiên Pù Luông, Thanh Hóa' },
    ],
  },
  {
    slug: 'bao-hoa-mai',
    name: 'Báo Hoa Mai',
    scientificName: 'Panthera pardus',
    description:
      'Báo hoa mai là loài mèo lớn phân bố rộng rãi nhất trong họ mèo, sinh sống từ châu Phi đến châu Á. Chúng nổi tiếng với khả năng leo trèo và thường treo con mồi lên cây để tránh các loài ăn thịt khác.',
    conservationStatus: 'Sẽ nguy cấp (VU)',
    images: [{ objectKey: 'seed/bao-hoa-mai', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/African_leopard_male_%28cropped%29.jpg/960px-African_leopard_male_%28cropped%29.jpg', caption: 'Báo Hoa Mai', isPrimary: true }],
    locations: [
      { latitude: 15.5, longitude: 107.5, placeName: 'Vườn quốc gia Kon Ka Kinh, Gia Lai' },
      { latitude: 12.0, longitude: 107.8, placeName: 'Vườn quốc gia Cát Tiên, Đồng Nai' },
      { latitude: 22.0, longitude: 104.0, placeName: 'Khu bảo tồn thiên nhiên Hoàng Liên Sơn, Lào Cai' },
    ],
  },
  {
    slug: 'soc-bay-khong-lo',
    name: 'Sóc Bay Khổng Lồ',
    scientificName: 'Petaurista philippensis',
    description:
      'Sóc bay khổng lồ là loài sóc bay lớn nhất ở Việt Nam, có thể lướt xa đến 75 mét nhờ màng da giữa tứ chi. Chúng hoạt động ban đêm, sống trên cây cao và ăn lá, hoa quả.',
    conservationStatus: 'Ít lo ngại (LC)',
    images: [{ objectKey: 'seed/soc-bay-khong-lo', url: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Indian_giant_flying_squirrel.jpg', caption: 'Sóc Bay Khổng Lồ', isPrimary: true }],
    locations: [
      { latitude: 16.0, longitude: 108.1, placeName: 'Vườn quốc gia Bạch Mã, Thừa Thiên Huế' },
      { latitude: 21.5, longitude: 105.2, placeName: 'Vườn quốc gia Tam Đảo, Vĩnh Phúc' },
    ],
  },
  {
    slug: 'vooc-mui-het',
    name: 'Voọc Mũi Hếch',
    scientificName: 'Rhinopithecus avunculus',
    description:
      'Voọc mũi hếch Bắc Bộ là loài linh trưởng đặc hữu của Việt Nam, chỉ còn tồn tại ở một số khu vực hẹp tại các tỉnh miền núi phía Bắc. Chúng có đặc điểm nhận dạng độc đáo là chiếc mũi hếch ngược lên trên.',
    conservationStatus: 'Cực kỳ nguy cấp (CR)',
    images: [{ objectKey: 'seed/vooc-mui-het', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Tonkin_snub-nosed_monkeys_%28Rhinopithecus_avunculus%29.jpg/960px-Tonkin_snub-nosed_monkeys_%28Rhinopithecus_avunculus%29.jpg', caption: 'Voọc Mũi Hếch Bắc Bộ', isPrimary: true }],
    locations: [
      { latitude: 22.5, longitude: 105.2, placeName: 'Khu bảo tồn thiên nhiên Khau Ca, Hà Giang' },
      { latitude: 22.3, longitude: 105.5, placeName: 'Khu bảo tồn thiên nhiên Du Già, Hà Giang' },
      { latitude: 22.0, longitude: 104.8, placeName: 'Vườn quốc gia Hoàng Liên, Lào Cai' },
    ],
  },
];

async function main() {
  console.log('Starting seed...');

  await prisma.speciesLocation.deleteMany();
  await prisma.speciesImage.deleteMany();
  await prisma.species.deleteMany();

  for (const data of speciesData) {
    const { locations, images, ...speciesInfo } = data;
    await prisma.species.create({
      data: {
        ...speciesInfo,
        locations: { create: locations },
        images: { create: images },
      },
    });
    console.log(`Created: ${speciesInfo.name}`);
  }

  console.log(`Seeded ${speciesData.length} species successfully!`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
