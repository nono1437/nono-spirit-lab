# 星梦牌旅 · 炎羽凰姬 Frame Lab

实验分支：`stardream-frame-lab`

目标：验证《星梦牌旅》炎羽凰姬真实逐帧动作、1:1 残影、连击节奏与稳定 VFX 强度。

当前本地原型：Formal Preview 1.3.2 Real Frame Scaffold。

动作帧顺序：hover → charge → dash → slash → dance → judgment → wingburst → 循环；连击结束使用 finisher。

关键规则：
- 每个有效点击推进一张真实动作图片，不再依靠单贴图旋转/缩放伪动作。
- 上一真实帧保留约 0.36 秒作为 1:1 残影，本体停在新帧位置，不自动复位。
- 点击识别间隔约 145ms，动作过渡约 205ms，使快速输入时自然产生前后帧重叠。
- 取消随机重特效叠层，改为固定节拍强化，减少“有时很轻、有时突然糊满屏”的粗糙感。
- 此分支只做动画/VFX实验，不覆盖 `main` 与 `play.nono.love` 当前内容。
