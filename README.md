# algolearn
面向计算机编程初学者的编程算法可视化学习平台

*<p style="opacity: 0.5">（不是初学者也适用，毕竟用不到的东西就日渐生疏了，who knows :) ）</p>*

## 启动说明

该工程编译后是一个网页项目。将其挂载到 http 服务器，直接进入 index.html 即可。官方地址为：https://algolearn.ttqf.tech/。

本系统支持 PWA。您可通过谷歌浏览器将其安装到设备上（PC 端和移动端均可，*但其实不太建议在移动端上使用）*，这样便可以在无网络情况下使用。操作方式请见下图。

<table>
    <tr>
        <th>桌面端</th>
        <th>移动端</th>
    </tr>
    <tr>
        <td><img src="https://user-images.githubusercontent.com/31009285/137109751-1c70070a-44cf-4807-99de-47a761b90123.png" /></td>
        <td><img src="https://user-images.githubusercontent.com/31009285/137109811-12bdddb6-46b7-4203-b64c-c33d1d32420b.png" /></td>
    </tr>
</table>

## 使用说明

本系统主界面如图所示。基本使用方法为在左侧选择教案，在右侧修改程序，并在运行程序的途中观察中间区域的变化，进行代码与演示的对照学习。

![运行演示截图](https://user-images.githubusercontent.com/31009285/137110497-e67bf7f3-f373-4a6b-a27b-203f582ced67.png)

值得注意的是，本系统所实现的代码编辑器仅能实现最基础的文字编辑功能以及代码高亮、文法语法错误提示功能，并不具备存档能力和代码提示能力。建议使用其他 IDE 进行程序编写后再粘贴到此处。修改后的代码请另行妥善保存，本系统不会存储修改后的代码。

## 开发说明

- 语言：TypeScript + tsx
- 框架：React
- 包管理器：yarn
- 启动方式：yarn start
- 编译方式：yarn build

如果在安装依赖的过程中出现了 node-sass 的相关错误，建议检查 python 及平台编译套件（如 Windows 上的 Microsoft Visual Studio）的完整性，并确保工程路径中没有中文。
