/**
 * packages/core/src/presets.generated.ts
 * ⚠️ 本文件由 scripts/build_presets.js 自动从 packages/core/presets/ 生成，请勿手动编辑！
 */

export interface PresetExample {
  id: string;
  title: string;
  code: string;
  stdin: string;
  expected: string;
}

export const PRESET_EXAMPLES: PresetExample[] = [
  {
    "id": "blank",
    "title": "0. 空白模板 (📄 自定义代码)",
    "code": "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // 在此输入你的 C++ 代码\n    cout << \"Hello, tiny-cpp!\" << endl;\n    return 0;\n}\n",
    "stdin": "",
    "expected": "Hello, tiny-cpp!\n"
  },
  {
    "id": "p1001-ab",
    "title": "1. 洛谷 P1001 A+B Problem (⚡ 极速验证)",
    "code": "#include <bits/stdc++.h>\nusing namespace std;\n#define int long long\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}\n",
    "stdin": "20 22",
    "expected": "42\n"
  },
  {
    "id": "gcd-statemachine",
    "title": "2. 欧几里得算法 GCD (📊 jyy 状态机图专用)",
    "code": "#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    while (b) {\n        int t = b;\n        b = a % b;\n        a = t;\n    }\n    cout << a << endl;\n    return 0;\n}\n",
    "stdin": "48 18",
    "expected": "6\n"
  },
  {
    "id": "p1428-fishes",
    "title": "3. 洛谷 P1428 小鱼比可爱 (🐟 分支循环与数组)",
    "code": "#include <bits/stdc++.h>\nusing namespace std;\nint a[105];\nint main() {\n    int n;\n    cin >> n;\n    for (int i = 0; i < n; i++) {\n        cin >> a[i];\n    }\n    for (int i = 0; i < n; i++) {\n        int cnt = 0;\n        for (int j = 0; j < i; j++) {\n            if (a[j] < a[i]) cnt++;\n        }\n        cout << cnt << \" \";\n    }\n    cout << endl;\n    return 0;\n}\n",
    "stdin": "6\n4 3 0 5 1 2",
    "expected": "0 0 0 3 1 2 \n"
  },
  {
    "id": "stl-vector-sort",
    "title": "4. STL 容器与排序 (📦 vector<pair> + sort + 范围 for)",
    "code": "#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    int n;\n    cin >> n;\n    vector<pair<int, int>> v;\n    for (int i = 0; i < n; i++) {\n        int val;\n        cin >> val;\n        v.push_back(make_pair(val, i));\n    }\n    sort(v.begin(), v.end());\n    for (auto &p : v) {\n        cout << p.first << \":\" << p.second << \" \";\n    }\n    cout << endl;\n    return 0;\n}\n",
    "stdin": "4\n30 10 40 20",
    "expected": "10:1 20:3 30:0 40:2 \n"
  },
  {
    "id": "func-ref-swap",
    "title": "5. 引用传参与自定义函数 (🔄 void swap(int &a, int &b))",
    "code": "#include <bits/stdc++.h>\nusing namespace std;\nvoid my_swap(int &x, int &y) {\n    int t = x;\n    x = y;\n    y = t;\n}\nint main() {\n    int a, b;\n    cin >> a >> b;\n    my_swap(a, b);\n    cout << a << \" \" << b << endl;\n    return 0;\n}\n",
    "stdin": "123 456",
    "expected": "456 123\n"
  }
];
