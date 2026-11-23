export class Vm {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        VmFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_vm_free(ptr, 0);
    }
    /**
     * @param {number} pid
     * @returns {string[]}
     */
    argv(pid) {
        const ret = wasm.vm_argv(this.__wbg_ptr, pid);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {number}
     */
    create_tty() {
        const ret = wasm.vm_create_tty(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {number} pid
     * @returns {string}
     */
    cwd(pid) {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.vm_cwd(this.__wbg_ptr, pid);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {number} pid
     * @returns {string[]}
     */
    env(pid) {
        const ret = wasm.vm_env(this.__wbg_ptr, pid);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @returns {number}
     */
    errno() {
        const ret = wasm.vm_errno(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} pid
     * @param {number} code
     */
    exit(pid, code) {
        wasm.vm_exit(this.__wbg_ptr, pid, code);
    }
    /**
     * @param {number} pid
     * @param {number} fd
     * @returns {boolean}
     */
    fd_close(pid, fd) {
        const ret = wasm.vm_fd_close(this.__wbg_ptr, pid, fd);
        return ret !== 0;
    }
    /**
     * @param {number} pid
     * @param {number} from
     * @param {number} to
     * @returns {boolean}
     */
    fd_dup2(pid, from, to) {
        const ret = wasm.vm_fd_dup2(this.__wbg_ptr, pid, from, to);
        return ret !== 0;
    }
    /**
     * [file type, flags], or empty.
     * @param {number} pid
     * @param {number} fd
     * @returns {Uint32Array}
     */
    fd_fdstat(pid, fd) {
        const ret = wasm.vm_fd_fdstat(this.__wbg_ptr, pid, fd);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * [dev, ino, filetype, nlink, size, atim, mtim, ctim].
     * @param {number} pid
     * @param {number} fd
     * @returns {BigUint64Array | undefined}
     */
    fd_filestat(pid, fd) {
        const ret = wasm.vm_fd_filestat(this.__wbg_ptr, pid, fd);
        let v1;
        if (ret[0] !== 0) {
            v1 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        }
        return v1;
    }
    /**
     * @param {number} pid
     * @param {number} fd
     * @param {number} max
     * @param {bigint} offset
     * @returns {Uint8Array | undefined}
     */
    fd_pread(pid, fd, max, offset) {
        const ret = wasm.vm_fd_pread(this.__wbg_ptr, pid, fd, max, offset);
        let v1;
        if (ret[0] !== 0) {
            v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @param {number} pid
     * @param {number} fd
     * @returns {string | undefined}
     */
    fd_prestat(pid, fd) {
        const ret = wasm.vm_fd_prestat(this.__wbg_ptr, pid, fd);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]);
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @param {number} pid
     * @param {number} fd
     * @param {Uint8Array | number[]} data
     * @param {bigint} offset
     * @returns {number}
     */
    fd_pwrite(pid, fd, data, offset) {
        const val2 = +pid;
        const val3 = +fd;
        const val4 = BigInt.asIntN(64, offset);
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.vm_fd_pwrite(this.__wbg_ptr, val2, val3, ptr0, len0, val4);
        return ret;
    }
    /**
     * None with AGAIN means wait for input.
     * @param {number} pid
     * @param {number} fd
     * @param {number} max
     * @returns {Uint8Array | undefined}
     */
    fd_read(pid, fd, max) {
        const ret = wasm.vm_fd_read(this.__wbg_ptr, pid, fd, max);
        let v1;
        if (ret[0] !== 0) {
            v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * WASI dirents from `cookie`, packed as fd_readdir returns them, at most `buf_len` bytes.
     * @param {number} pid
     * @param {number} fd
     * @param {bigint} cookie
     * @param {number} buf_len
     * @returns {Uint8Array | undefined}
     */
    fd_readdir(pid, fd, cookie, buf_len) {
        const ret = wasm.vm_fd_readdir(this.__wbg_ptr, pid, fd, cookie, buf_len);
        let v1;
        if (ret[0] !== 0) {
            v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * @param {number} pid
     * @param {number} fd
     * @param {boolean} write
     * @returns {boolean}
     */
    fd_ready(pid, fd, write) {
        const ret = wasm.vm_fd_ready(this.__wbg_ptr, pid, fd, write);
        return ret !== 0;
    }
    /**
     * @param {number} pid
     * @param {number} from
     * @param {number} to
     * @returns {boolean}
     */
    fd_renumber(pid, from, to) {
        const ret = wasm.vm_fd_renumber(this.__wbg_ptr, pid, from, to);
        return ret !== 0;
    }
    /**
     * @param {number} pid
     * @param {number} fd
     * @param {bigint} offset
     * @param {number} whence
     * @returns {bigint | undefined}
     */
    fd_seek(pid, fd, offset, whence) {
        const ret = wasm.vm_fd_seek(this.__wbg_ptr, pid, fd, offset, whence);
        return ret[0] === 0 ? undefined : BigInt.asUintN(64, ret[1]);
    }
    /**
     * @param {number} pid
     * @param {number} fd
     * @param {number} flags
     * @returns {boolean}
     */
    fd_set_flags(pid, fd, flags) {
        const ret = wasm.vm_fd_set_flags(this.__wbg_ptr, pid, fd, flags);
        return ret !== 0;
    }
    /**
     * @param {number} pid
     * @param {number} fd
     * @param {bigint} size
     * @returns {boolean}
     */
    fd_set_size(pid, fd, size) {
        const ret = wasm.vm_fd_set_size(this.__wbg_ptr, pid, fd, size);
        return ret !== 0;
    }
    /**
     * Bytes taken, or -1 (AGAIN: wait until the pipe has room).
     * @param {number} pid
     * @param {number} fd
     * @param {Uint8Array | number[]} data
     * @returns {number}
     */
    fd_write(pid, fd, data) {
        const val2 = +pid;
        const val3 = +fd;
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.vm_fd_write(this.__wbg_ptr, val2, val3, ptr0, len0);
        return ret;
    }
    /**
     * @param {number} pgid
     * @param {number} status
     */
    kill_group(pgid, status) {
        wasm.vm_kill_group(this.__wbg_ptr, pgid, status);
    }
    /**
     * The exit status a signal asked for, or -1.
     * @param {number} pid
     * @returns {number}
     */
    killed(pid) {
        const ret = wasm.vm_killed(this.__wbg_ptr, pid);
        return ret;
    }
    /**
     * 0 none, 3 directory, 4 file, 7 symlink, 2 device.
     * @param {string} path
     * @returns {number}
     */
    kind(path) {
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.vm_kind(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * `ls -l`-style JSON listing of a directory: [{name, kind, size, mtime}].
     * @param {string} path
     * @returns {string | undefined}
     */
    list(path) {
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.vm_list(this.__wbg_ptr, ptr0, len0);
        let v2;
        if (ret[0] !== 0) {
            v2 = getStringFromWasm0(ret[0], ret[1]);
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v2;
    }
    /**
     * @param {string} path
     */
    mkdir_p(path) {
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.vm_mkdir_p(this.__wbg_ptr, ptr0, len0);
    }
    constructor() {
        const ret = wasm.vm_new();
        this.__wbg_ptr = ret;
        VmFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} pid
     * @param {number} dirfd
     * @param {string} path
     * @returns {boolean}
     */
    path_mkdir(pid, dirfd, path) {
        const val2 = +pid;
        const val3 = +dirfd;
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.vm_path_mkdir(this.__wbg_ptr, val2, val3, ptr0, len0);
        return ret !== 0;
    }
    /**
     * @param {number} pid
     * @param {number} dirfd
     * @param {string} path
     * @param {boolean} follow
     * @param {number} oflags
     * @param {bigint} rights
     * @param {number} fdflags
     * @returns {number}
     */
    path_open(pid, dirfd, path, follow, oflags, rights, fdflags) {
        const val2 = +pid;
        const val3 = +dirfd;
        const val4 = +follow;
        const val5 = +oflags;
        const val6 = BigInt.asIntN(64, rights);
        const val7 = +fdflags;
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.vm_path_open(this.__wbg_ptr, val2, val3, ptr0, len0, val4, val5, val6, val7);
        return ret;
    }
    /**
     * @param {number} pid
     * @param {number} dirfd
     * @param {string} path
     * @returns {string | undefined}
     */
    path_readlink(pid, dirfd, path) {
        const val2 = +pid;
        const val3 = +dirfd;
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.vm_path_readlink(this.__wbg_ptr, val2, val3, ptr0, len0);
        let v4;
        if (ret[0] !== 0) {
            v4 = getStringFromWasm0(ret[0], ret[1]);
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v4;
    }
    /**
     * @param {number} pid
     * @param {number} dirfd
     * @param {string} path
     * @param {boolean} dir
     * @returns {boolean}
     */
    path_remove(pid, dirfd, path, dir) {
        const val2 = +pid;
        const val3 = +dirfd;
        const val4 = +dir;
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.vm_path_remove(this.__wbg_ptr, val2, val3, ptr0, len0, val4);
        return ret !== 0;
    }
    /**
     * @param {number} pid
     * @param {number} fd1
     * @param {string} from
     * @param {number} fd2
     * @param {string} to
     * @returns {boolean}
     */
    path_rename(pid, fd1, from, fd2, to) {
        const val3 = +pid;
        const val4 = +fd1;
        const val5 = +fd2;
        let ptr0, len0, ptr1, len1;
        try {
            ptr0 = passStringToWasm0(from, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len0 = WASM_VECTOR_LEN;
            ptr1 = passStringToWasm0(to, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len1 = WASM_VECTOR_LEN;
        } catch (e) {
            if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
            if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
            throw e;
        }
        const ret = wasm.vm_path_rename(this.__wbg_ptr, val3, val4, ptr0, len0, val5, ptr1, len1);
        return ret !== 0;
    }
    /**
     * @param {number} pid
     * @param {number} dirfd
     * @param {string} path
     * @param {bigint} mtime
     * @returns {boolean}
     */
    path_set_times(pid, dirfd, path, mtime) {
        const val2 = +pid;
        const val3 = +dirfd;
        const val4 = BigInt.asIntN(64, mtime);
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.vm_path_set_times(this.__wbg_ptr, val2, val3, ptr0, len0, val4);
        return ret !== 0;
    }
    /**
     * @param {number} pid
     * @param {number} dirfd
     * @param {string} path
     * @param {boolean} follow
     * @returns {BigUint64Array | undefined}
     */
    path_stat(pid, dirfd, path, follow) {
        const val2 = +pid;
        const val3 = +dirfd;
        const val4 = +follow;
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.vm_path_stat(this.__wbg_ptr, val2, val3, ptr0, len0, val4);
        let v5;
        if (ret[0] !== 0) {
            v5 = getArrayU64FromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
        }
        return v5;
    }
    /**
     * @param {number} pid
     * @param {string} target
     * @param {number} dirfd
     * @param {string} path
     * @returns {boolean}
     */
    path_symlink(pid, target, dirfd, path) {
        const val3 = +pid;
        const val4 = +dirfd;
        let ptr0, len0, ptr1, len1;
        try {
            ptr0 = passStringToWasm0(target, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len0 = WASM_VECTOR_LEN;
            ptr1 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len1 = WASM_VECTOR_LEN;
        } catch (e) {
            if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
            if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
            throw e;
        }
        const ret = wasm.vm_path_symlink(this.__wbg_ptr, val3, ptr0, len0, val4, ptr1, len1);
        return ret !== 0;
    }
    /**
     * @param {number} pid
     * @returns {number}
     */
    pgid(pid) {
        const ret = wasm.vm_pgid(this.__wbg_ptr, pid);
        return ret >>> 0;
    }
    /**
     * [read fd, write fd], or empty.
     * @param {number} pid
     * @returns {Uint32Array}
     */
    pipe(pid) {
        const ret = wasm.vm_pipe(this.__wbg_ptr, pid);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @param {string} path
     * @returns {Uint8Array | undefined}
     */
    read_file(path) {
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.vm_read_file(this.__wbg_ptr, ptr0, len0);
        let v2;
        if (ret[0] !== 0) {
            v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v2;
    }
    /**
     * @param {Uint8Array | number[]} bytes
     * @returns {boolean}
     */
    restore(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.vm_restore(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * @param {number} pid
     * @returns {boolean}
     */
    running(pid) {
        const ret = wasm.vm_running(this.__wbg_ptr, pid);
        return ret !== 0;
    }
    /**
     * @param {number} s
     */
    seed(s) {
        wasm.vm_seed(this.__wbg_ptr, s);
    }
    /**
     * @param {number} tty
     * @param {number} pgid
     */
    set_foreground(tty, pgid) {
        wasm.vm_set_foreground(this.__wbg_ptr, tty, pgid);
    }
    /**
     * @param {number} pid
     * @param {boolean} on
     */
    set_ignore_interrupt(pid, on) {
        wasm.vm_set_ignore_interrupt(this.__wbg_ptr, pid, on);
    }
    /**
     * @param {string} path
     * @param {number} mode
     * @returns {boolean}
     */
    set_mode(path, mode) {
        const val2 = +mode;
        const ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.vm_set_mode(this.__wbg_ptr, ptr0, len0, val2);
        return ret !== 0;
    }
    /**
     * @param {number} ns
     */
    set_time(ns) {
        wasm.vm_set_time(this.__wbg_ptr, ns);
    }
    /**
     * @param {string} prefix
     * @returns {Uint8Array}
     */
    snapshot(prefix) {
        const ptr0 = passStringToWasm0(prefix, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.vm_snapshot(this.__wbg_ptr, ptr0, len0);
        var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v2;
    }
    /**
     * `fd_map`: flattened (child fd, parent fd) pairs. `pgid` 0 starts a new group.
     * @param {number} parent
     * @param {string[]} argv
     * @param {string[]} env
     * @param {string} cwd
     * @param {Uint32Array | number[]} fd_map
     * @param {number} pgid
     * @returns {number}
     */
    spawn(parent, argv, env, cwd, fd_map, pgid) {
        const val5 = +parent;
        const val6 = +pgid;
        let ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3;
        try {
            ptr0 = passArrayJsValueToWasm0(argv, wasm.__wbindgen_malloc);
            len0 = WASM_VECTOR_LEN;
            ptr1 = passArrayJsValueToWasm0(env, wasm.__wbindgen_malloc);
            len1 = WASM_VECTOR_LEN;
            ptr2 = passStringToWasm0(cwd, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len2 = WASM_VECTOR_LEN;
            ptr3 = passArray32ToWasm0(fd_map, wasm.__wbindgen_malloc);
            len3 = WASM_VECTOR_LEN;
        } catch (e) {
            if (ptr3) { wasm.__wbindgen_free(ptr3, len3 * 4, 4); }
            if (ptr2) { wasm.__wbindgen_free(ptr2, len2 * 1, 1); }
            if (ptr1) { wasm.__externref_drop_slice(ptr1, len1); wasm.__wbindgen_free(ptr1, len1 * 4, 4); }
            if (ptr0) { wasm.__externref_drop_slice(ptr0, len0); wasm.__wbindgen_free(ptr0, len0 * 4, 4); }
            throw e;
        }
        const ret = wasm.vm_spawn(this.__wbg_ptr, val5, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, val6);
        return ret;
    }
    /**
     * @param {string[]} argv
     * @param {string[]} env
     * @param {string} cwd
     * @param {number} tty
     * @returns {number}
     */
    spawn_on_tty(argv, env, cwd, tty) {
        const val4 = +tty;
        let ptr0, len0, ptr1, len1, ptr2, len2;
        try {
            ptr0 = passArrayJsValueToWasm0(argv, wasm.__wbindgen_malloc);
            len0 = WASM_VECTOR_LEN;
            ptr1 = passArrayJsValueToWasm0(env, wasm.__wbindgen_malloc);
            len1 = WASM_VECTOR_LEN;
            ptr2 = passStringToWasm0(cwd, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len2 = WASM_VECTOR_LEN;
        } catch (e) {
            if (ptr2) { wasm.__wbindgen_free(ptr2, len2 * 1, 1); }
            if (ptr1) { wasm.__externref_drop_slice(ptr1, len1); wasm.__wbindgen_free(ptr1, len1 * 4, 4); }
            if (ptr0) { wasm.__externref_drop_slice(ptr0, len0); wasm.__wbindgen_free(ptr0, len0 * 4, 4); }
            throw e;
        }
        const ret = wasm.vm_spawn_on_tty(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2, val4);
        return ret;
    }
    /**
     * @param {string} target
     * @param {string} path
     * @returns {boolean}
     */
    symlink(target, path) {
        let ptr0, len0, ptr1, len1;
        try {
            ptr0 = passStringToWasm0(target, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len0 = WASM_VECTOR_LEN;
            ptr1 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len1 = WASM_VECTOR_LEN;
        } catch (e) {
            if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
            if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
            throw e;
        }
        const ret = wasm.vm_symlink(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret !== 0;
    }
    /**
     * @param {number} id
     * @param {Uint8Array | number[]} bytes
     */
    tty_input(id, bytes) {
        const val2 = +id;
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.vm_tty_input(this.__wbg_ptr, val2, ptr0, len0);
    }
    /**
     * The terminal on a process's standard input, or -1.
     * @param {number} pid
     * @returns {number}
     */
    tty_of(pid) {
        const ret = wasm.vm_tty_of(this.__wbg_ptr, pid);
        return ret;
    }
    /**
     * @param {number} id
     * @param {number} cols
     * @param {number} rows
     */
    tty_resize(id, cols, rows) {
        wasm.vm_tty_resize(this.__wbg_ptr, id, cols, rows);
    }
    /**
     * @param {number} id
     * @param {boolean} raw
     */
    tty_set_raw(id, raw) {
        wasm.vm_tty_set_raw(this.__wbg_ptr, id, raw);
    }
    /**
     * [cols, rows] of a terminal.
     * @param {number} id
     * @returns {Uint32Array}
     */
    tty_size(id) {
        const ret = wasm.vm_tty_size(this.__wbg_ptr, id);
        var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * @param {number} id
     * @returns {Uint8Array}
     */
    tty_take_output(id) {
        const ret = wasm.vm_tty_take_output(this.__wbg_ptr, id);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Exit status, or -1 with errno AGAIN while the child runs (CHILD if it is not one).
     * @param {number} parent
     * @param {number} child
     * @returns {number}
     */
    wait(parent, child) {
        const ret = wasm.vm_wait(this.__wbg_ptr, parent, child);
        return ret;
    }
    /**
     * @param {number} pid
     * @param {string} name
     * @param {string} path
     * @returns {string | undefined}
     */
    which(pid, name, path) {
        const val3 = +pid;
        let ptr0, len0, ptr1, len1;
        try {
            ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len0 = WASM_VECTOR_LEN;
            ptr1 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len1 = WASM_VECTOR_LEN;
        } catch (e) {
            if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
            if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
            throw e;
        }
        const ret = wasm.vm_which(this.__wbg_ptr, val3, ptr0, len0, ptr1, len1);
        let v4;
        if (ret[0] !== 0) {
            v4 = getStringFromWasm0(ret[0], ret[1]);
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v4;
    }
    /**
     * @param {string} path
     * @param {Uint8Array | number[]} data
     * @returns {boolean}
     */
    write_file(path, data) {
        let ptr0, len0, ptr1, len1;
        try {
            ptr0 = passStringToWasm0(path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            len0 = WASM_VECTOR_LEN;
            ptr1 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
            len1 = WASM_VECTOR_LEN;
        } catch (e) {
            if (ptr1) { wasm.__wbindgen_free(ptr1, len1 * 1, 1); }
            if (ptr0) { wasm.__wbindgen_free(ptr0, len0 * 1, 1); }
            throw e;
        }
        const ret = wasm.vm_write_file(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret !== 0;
    }
}
if (Symbol.dispose) Vm.prototype[Symbol.dispose] = Vm.prototype.free;
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_string_get_7ce8eee7fd327545: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_4c88d8bf264fd984: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_generic_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            table.set(0, undefined);
            table.set(1024, undefined);
            table.set(1025, null);
            table.set(1026, true);
            table.set(1027, false);
        },
    };
    return {
        __proto__: null,
        "./evolve_vm_bg.js": import0,
    };
}

const VmFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_vm_free(ptr, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU64FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getBigUint64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedBigUint64ArrayMemory0 = null;
function getBigUint64ArrayMemory0() {
    if (cachedBigUint64ArrayMemory0 === null || cachedBigUint64ArrayMemory0.byteLength === 0) {
        cachedBigUint64ArrayMemory0 = new BigUint64Array(wasm.memory.buffer);
    }
    return cachedBigUint64ArrayMemory0;
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(bytes) {
    numBytesDecoded += bytes.length;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
        cachedTextDecoder.decode();
        numBytesDecoded = bytes.length;
    }
    return cachedTextDecoder.decode(bytes);
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedBigUint64ArrayMemory0 = null;
    cachedDataViewMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

let __wbg_init_promise;
async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;
    if (__wbg_init_promise === undefined) {
        __wbg_init_promise = __wbg_init_once(module_or_path);
        __wbg_init_promise.catch(() => { __wbg_init_promise = undefined; });
    }
    return __wbg_init_promise;
}

async function __wbg_init_once(module_or_path) {

    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('evolve_vm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
