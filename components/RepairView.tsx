import React, { useState } from 'react';
import { SkinReport, RecommendedProduct } from '../types';
import { 
  Zap, ShoppingBag, ShieldCheck, Sparkles, 
  ArrowRight, Info, Star, CheckCircle2, 
  Store, Package, Heart, Filter
} from 'lucide-react';
import { motion } from 'motion/react';

import { Language, translations } from '../src/i18n';

interface RepairViewProps {
  lastReport: SkinReport | null;
  language: Language;
}

const LIGHT_THERAPY_PLANS = [
  {
    id: 'red',
    name: '深层修护红光方案',
    wavelength: '633nm',
    duration: '15min',
    frequency: '每日',
    color: 'Red',
    hex: '#FF0000',
    description: '针对屏障受损与细纹，促进胶原蛋白再生，加速细胞修复。',
    benefits: ['修护屏障', '淡化细纹', '提升弹性']
  },
  {
    id: 'blue',
    name: '净痘控油蓝光方案',
    wavelength: '415nm',
    duration: '10min',
    frequency: '隔日',
    color: 'Blue',
    hex: '#0000FF',
    description: '针对痤疮丙酸杆菌，有效杀菌消炎，平衡油脂分泌。',
    benefits: ['杀菌消炎', '控油收敛', '预防痘印']
  },
  {
    id: 'yellow',
    name: '舒缓退红黄光方案',
    wavelength: '590nm',
    duration: '12min',
    frequency: '每日',
    color: 'Yellow',
    hex: '#FFFF00',
    description: '针对敏感泛红，改善微循环，增强皮肤抵抗力。',
    benefits: ['缓解泛红', '舒缓敏感', '提亮肤色']
  }
];

const MOCK_CATEGORIES = ['全部', '洁面', '精华', '面霜', '防晒', '面膜'];

const MOCK_PRODUCTS: RecommendedProduct[] = [
  {
    id: 'p1',
    name: '修丽可 CE 复合修护精华液',
    brand: 'SkinCeuticals',
    category: '精华',
    imageUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1000&auto=format&fit=crop',
    price: '¥1490',
    matchReason: '高浓度维C能有效对抗氧化压力，改善色素沉着并提升屏障抵御力。',
    buyUrl: '#',
    tags: ['抗氧', '提亮', '专业线']
  },
  {
    id: 'p2',
    name: '海蓝之谜 浓缩修护精华露',
    brand: 'La Mer',
    category: '精华',
    imageUrl: 'https://images.unsplash.com/photo-1594465919760-441fe5908ab0?q=80&w=1000&auto=format&fit=crop',
    price: '¥3100',
    matchReason: '神奇活性精萃 Miracle Broth™ 具有强大的修护能量，针对受损屏障有显著效果。',
    buyUrl: '#',
    tags: ['顶级修护', '舒缓', '贵妇']
  },
  {
    id: 'p3',
    name: '赫莲娜 活颜修护晚霜 (黑绷带)',
    brand: 'HR',
    category: '面霜',
    imageUrl: 'https://images.unsplash.com/photo-1617897903246-719242758050?q=80&w=1000&auto=format&fit=crop',
    price: '¥3480',
    matchReason: '30%玻色因浓度，针对术后或极度受损肌肤提供“绷带式”修护。',
    buyUrl: '#',
    tags: ['高浓玻色因', '抗老', '修护']
  },
  {
    id: 'p4',
    name: 'CPB 肌肤之钥 净采洁面膏',
    brand: 'CPB',
    category: '洁面',
    imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=1000&auto=format&fit=crop',
    price: '¥450',
    matchReason: '温和氨基酸配方，在清洁的同时保留皮肤天然水分，适合敏感期。',
    buyUrl: '#',
    tags: ['温和', '滋润', '奢华']
  }
];

const RepairView: React.FC<RepairViewProps> = ({ lastReport, language }) => {
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const t = translations[language];

  const filteredProducts = selectedCategory === '全部' 
    ? MOCK_PRODUCTS 
    : MOCK_PRODUCTS.filter(p => p.category === selectedCategory);

  return (
    <div className="flex flex-col gap-12 animate-fade">
      {/* Section 1: Light Therapy Plans */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={20} className="text-[#AF9B60]" />
            <h3 className="text-lg font-serif italic text-[#2D2422]">光疗配方方案 / Light Therapy Prescriptions</h3>
          </div>
          <button className="text-[10px] font-medium text-[#AF9B60] uppercase tracking-widest flex items-center gap-2 hover:underline">
            查看更多方案 <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {LIGHT_THERAPY_PLANS.map((plan) => (
            <motion.div
              key={plan.id}
              whileHover={{ y: -10 }}
              className="bg-white rounded-[2.5rem] p-8 border border-[#E5E4E2] shadow-sm hover:shadow-xl transition-all relative overflow-hidden group"
            >
              <div 
                className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity"
                style={{ backgroundColor: plan.hex }}
              ></div>
              
              <div className="flex items-center gap-4 mb-6">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: plan.hex }}
                >
                  <Zap size={24} fill="currentColor" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[#2D2422]">{plan.name}</h4>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{plan.wavelength} · {plan.duration}</p>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed font-serif-sc italic mb-6">
                {plan.description}
              </p>

              <div className="space-y-3 mb-8">
                {plan.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2 text-[10px] font-medium text-slate-600 uppercase tracking-widest">
                    <CheckCircle2 size={14} className="text-[#AF9B60]" />
                    {benefit}
                  </div>
                ))}
              </div>

              <button className="w-full py-4 bg-slate-50 rounded-2xl text-[10px] font-medium text-[#AF9B60] uppercase tracking-widest hover:bg-[#AF9B60] hover:text-white transition-all">
                开启疗程
              </button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Section 2: Skincare Recommendation System */}
      <section className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3 shrink-0">
            <ShoppingBag size={20} className="text-[#AF9B60]" />
            <h3 className="text-lg font-serif italic text-[#2D2422] whitespace-nowrap">{t.recommendationSystem}</h3>
          </div>
          
          <div className="flex items-center gap-4 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {MOCK_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-2.5 rounded-full text-[10px] font-medium uppercase tracking-widest transition-all whitespace-nowrap ${
                  selectedCategory === cat 
                    ? 'bg-[#AF9B60] text-white shadow-lg' 
                    : 'bg-white border border-[#E5E4E2] text-slate-400 hover:border-[#AF9B60]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[2rem] overflow-hidden border border-[#E5E4E2] shadow-sm hover:shadow-md transition-all group"
            >
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute top-4 right-4">
                  <button className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-[#AF9B60] shadow-sm hover:bg-white transition-all">
                    <Heart size={18} />
                  </button>
                </div>
                <div className="absolute bottom-4 left-4 flex gap-2">
                  {product.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[8px] font-medium text-[#AF9B60] uppercase tracking-widest">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-[10px] font-medium text-[#AF9B60] uppercase tracking-widest">{product.brand}</p>
                  <h4 className="text-sm font-medium text-[#2D2422] mt-1 line-clamp-1">{product.name}</h4>
                </div>
                
                <p className="text-[10px] text-slate-400 leading-relaxed font-serif-sc italic line-clamp-2">
                  {product.matchReason}
                </p>
                
                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg serif-heading italic text-[#2D2422]">{product.price}</span>
                  <button className="px-5 py-2 bg-[#2D2422] text-white rounded-full text-[10px] font-medium uppercase tracking-widest hover:bg-black transition-all">
                    立即购买
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Section 3: Merchant Onboarding */}
      <section className="bg-[#2D2422] rounded-[3rem] p-10 lg:p-16 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#AF9B60] rounded-full blur-[120px] opacity-10 -mr-48 -mt-48"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-[#AF9B60]">
                <Store size={32} />
              </div>
              <div>
                <h3 className="text-2xl lg:text-3xl font-serif italic">商家入驻系统 <span className="text-xs lg:text-sm not-italic opacity-40 ml-2">Merchant Onboarding</span></h3>
                <p className="text-[10px] lg:text-[12px] text-[#AF9B60] uppercase tracking-[0.4em] mt-1 font-medium">加入 LUMSUE 全球美学供应链</p>
              </div>
            </div>
            <p className="text-sm lg:text-base text-slate-300 leading-relaxed font-serif-sc italic">
              我们诚邀全球顶尖护肤品牌与专业美容机构入驻。通过 LUMSUE 的 AI 推荐引擎，将您的优质产品精准对接给最需要的用户。
            </p>
            <div className="flex flex-wrap gap-8">
              <div className="flex items-center gap-3">
                <Star size={20} className="text-[#AF9B60]" />
                <span className="text-xs font-medium uppercase tracking-widest">精准流量导向</span>
              </div>
              <div className="flex items-center gap-3">
                <Package size={20} className="text-[#AF9B60]" />
                <span className="text-xs font-medium uppercase tracking-widest">全渠道供应链</span>
              </div>
              <div className="flex items-center gap-3">
                <Sparkles size={20} className="text-[#AF9B60]" />
                <span className="text-xs font-medium uppercase tracking-widest">AI 赋能营销</span>
              </div>
            </div>
          </div>
          <button className="px-12 py-5 bg-[#AF9B60] text-white rounded-full text-xs font-medium uppercase tracking-[0.3em] hover:bg-white hover:text-[#2D2422] transition-all shadow-2xl">
            立即申请入驻
          </button>
        </div>
      </section>
    </div>
  );
};

export default RepairView;
